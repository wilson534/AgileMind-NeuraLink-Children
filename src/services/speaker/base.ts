import {
  MiIOT,
  MiNA,
  MiServiceConfig,
  getMiIOT,
  getMiNA,
} from "mi-service-lite";
import { clamp, sleep } from "../../utils/base";
import { jsonEncode } from "../../utils/parse";
import { Logger } from "../../utils/log";
import { StreamResponse } from "./stream";
import { kAreYouOK } from "../../utils/string";
import { fastRetry } from "../../utils/retry";

export type TTSProvider = "xiaoai" | "custom";

type Speaker = {
  name?: string;
  gender?: string;
  speaker: string;
};

type ActionCommand = [number, number];
type PropertyCommand = [number, number, number];

export type BaseSpeakerConfig = MiServiceConfig & {
  /**
   * 启用调试（仅调试 MiGPT 相关日志）
   */
  debug?: boolean;
  /**
   * 追踪 Mi Service 相关日志（更底层）
   */
  enableTrace?: boolean;
  /**
   * 是否启用流式响应
   *
   * 部分小爱音箱型号不支持查询播放状态，需要关闭流式响应
   *
   * 关闭后会在 LLM 回答完毕后再 TTS 完整文本，且无法使用唤醒模式等功能
   */
  streamResponse?: boolean;
  /**
   * 语音合成服务商
   */
  tts?: TTSProvider;
  /**
   * 小爱音箱 TTS 指令
   *
   * 比如：小爱音箱 Pro（lx06） -> [5, 1]
   *
   * 具体指令可在此网站查询：https://home.miot-spec.com
   */
  ttsCommand?: ActionCommand;
  /**
   * 小爱音箱唤醒指令
   *
   * 比如：小爱音箱 Pro（lx06） -> [5, 3]
   *
   * 具体指令可在此网站查询：https://home.miot-spec.com
   */
  wakeUpCommand?: ActionCommand;
  /**
   * 查询小爱音响是否在播放中指令
   *
   * 比如：小爱音箱 Play（lx05） -> [3, 1, 1]
   *
   * 具体指令可在此网站查询：https://home.miot-spec.com
   */
  playingCommand?: PropertyCommand;
  /**
   * 播放状态检测间隔（单位毫秒，最低 500 毫秒，默认 1 秒）
   */
  checkInterval?: number;
  /**
   *   下发 TTS 指令多长时间后开始检测播放状态（单位秒，默认 3 秒）
   */
  checkTTSStatusAfter?: number;
  /**
   * TTS 开始/结束提示音
   */
  audioBeep?: string;
  /**
   * 网络请求超时时长，单位毫秒，默认值 3000 （3 秒）
   */
  timeout?: number;
};

export class BaseSpeaker {
  MiNA?: MiNA;
  MiIOT?: MiIOT;
  config: MiServiceConfig;
  logger = Logger.create({ tag: "Speaker" });
  debug = false;
  streamResponse = true;
  checkInterval: number;
  checkTTSStatusAfter: number;
  tts: TTSProvider;
  ttsCommand: ActionCommand;
  wakeUpCommand: ActionCommand;
  playingCommand?: PropertyCommand;

  // 添加新属性来跟踪上次 unWakeUp 的时间
  private _lastUnwakeTime?: number;
  private _ttsBuffer = '';
  private _ttsBufferTimeout?: NodeJS.Timeout;

  constructor(config: BaseSpeakerConfig) {
    this.config = config;
    this.config.timeout = config.timeout ?? 5000;
    const {
      debug = false,
      streamResponse = true,
      checkInterval = 1000,
      checkTTSStatusAfter = 3,
      tts = "xiaoai",
      playingCommand,
      ttsCommand = [5, 1],
      wakeUpCommand = [5, 3],
      audioBeep = process.env.AUDIO_BEEP,
    } = config;

    // 检查配置中的命令是否被颠倒了
    if (config.ttsCommand && config.ttsCommand[0] === 5 && config.ttsCommand[1] === 3) {
      this.logger.log('⚠️ 检测到 ttsCommand 可能配置错误，应为 [5,1] 而不是 [5,3]');
      this.ttsCommand = [5, 1]; // 强制修正
    } else {
      this.ttsCommand = ttsCommand;
    }
    
    if (config.wakeUpCommand && config.wakeUpCommand[0] === 5 && config.wakeUpCommand[1] === 1) {
      this.logger.log('⚠️ 检测到 wakeUpCommand 可能配置错误，应为 [5,3] 而不是 [5,1]');
      this.wakeUpCommand = [5, 3]; // 强制修正
    } else {
      this.wakeUpCommand = wakeUpCommand;
    }
    
    this.debug = debug;
    this.streamResponse = streamResponse;
    this.audioBeep = audioBeep;
    this.checkInterval = clamp(checkInterval, 500, Infinity);
    this.checkTTSStatusAfter = checkTTSStatusAfter;
    this.tts = tts;
    if (this.tts === 'custom') {
        // 使用 void 操作符来正确处理异步操作
        void this.testTTSService().then(success => {
            if (!success) {
                this.logger.error('⚠️ TTS 服务测试失败，将回退到小爱默认 TTS');  // 将 log 改为 error
                this.tts = 'xiaoai';
            }
        });
    }
    // todo 考虑维护常见设备型号的指令列表，并自动从 spec 文件判断属性权限
    this.ttsCommand = ttsCommand;
    this.wakeUpCommand = wakeUpCommand;
    this.playingCommand = playingCommand;
  }

  private async testTTSService() {
    try {
        this.logger.log('开始测试 TTS 服务...');
        this.logger.log('TTS_BASE_URL:', process.env.TTS_BASE_URL);
        
        if (!process.env.TTS_BASE_URL) {
            this.logger.error('TTS_BASE_URL 未配置');
            return false;
        }

        // 首先测试 speakers 接口
        this.logger.log('测试 speakers 接口...');
        const speakersUrl = `${process.env.TTS_BASE_URL}/are-you-ok/api/speakers`;
        const speakersResponse = await fetch(speakersUrl, {
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!speakersResponse.ok) {
            this.logger.error('speakers 接口测试失败:', speakersResponse.statusText);
            return false;
        }
        this.logger.log('speakers 接口测试成功');

        // 然后测试 tts 接口
        const testUrl = `${process.env.TTS_BASE_URL}/are-you-ok/api/tts.mp3?speaker=S_TDTaLFJj1&text=测试`;
        this.logger.log('测试 TTS URL:', testUrl);
        
        const response = await fetch(testUrl, {
            headers: {
                'Accept': 'audio/mpeg'
            }
        });
        this.logger.log('TTS 测试响应状态:', response.status);
        
        if (!response.ok) {
            this.logger.error('TTS 服务测试失败:', response.statusText);
            return false;
        }

        // 验证响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('audio/mpeg')) {
            this.logger.error('TTS 响应类型错误:', contentType);
            return false;
        }

        this.logger.log('TTS 服务测试成功');
        return true;
    } catch (error) {
        this.logger.error('TTS 服务连接失败:', error);
        return false;
    }
}


  async initMiServices() {
    this.MiNA = await getMiNA(this.config);
    this.MiIOT = await getMiIOT(this.config);
    this.logger.assert(!!this.MiNA && !!this.MiIOT, "初始化 Mi Services 失败");
    if (this.debug) {
      const d: any = this.MiIOT!.account?.device;
      this.logger.debug(
        "配置参数：",
        jsonEncode(this.config, { prettier: true })
      );
      this.logger.debug(
        "环境变量：",
        jsonEncode(process.env, { prettier: true })
      );
      this.logger.debug(
        "设备信息：",
        jsonEncode(
          {
            name: d?.name,
            desc: d?.desc,
            model: d?.model,
            rom: d?.extra?.fw_version,
          },
          { prettier: true }
        )
      );
    }
  }

  wakeUp() {
    if (this.debug) {
      this.logger.debug("wakeUp");
    }
    return this.MiIOT!.doAction(...this.wakeUpCommand);
  }

  async unWakeUp() {
    // 避免频繁调用 unWakeUp
    const now = Date.now();
    if (this._lastUnwakeTime && now - this._lastUnwakeTime < 3000) {
      if (this.debug) {
        this.logger.debug("跳过 unWakeUp (3秒内已调用过)");
      }
      return;
    }
    
    this._lastUnwakeTime = now;
    if (this.debug) {
      this.logger.debug("unWakeUp");
    }
    // 通过 TTS 不发音文本，使小爱退出唤醒状态
    await this.MiNA!.pause();
    await sleep(100);
    await this.MiIOT!.doAction(...this.ttsCommand, kAreYouOK);
    await sleep(100);
  }

  audioBeep?: string;
  responding = false;
  /**
   * 检测是否有新消息
   *
   * 有新消息产生时，旧的回复会终止
   */
  checkIfHasNewMsg() {
    return { hasNewMsg: () => false, noNewMsg: () => true };
  }
  async response(options: {
    tts?: TTSProvider;
    text?: string;
    stream?: StreamResponse;
    audio?: string;
    speaker?: string;
    keepAlive?: boolean;
    playSFX?: boolean;
    hasNewMsg?: () => boolean;
  }) {
    let {
      text,
      audio,
      stream,
      playSFX = true,
      keepAlive = false,
      tts = this.tts,
    } = options ?? {};
    options.hasNewMsg ??= this.checkIfHasNewMsg().hasNewMsg;

    if (!text && !stream && !audio) {
      return;
    }

    const customTTS = process.env.TTS_BASE_URL;
    if (!customTTS) {
      tts = "xiaoai"; // 没有提供 TTS 接口时，只能使用小爱自带 TTS
    }

    const ttsNotXiaoai = tts !== "xiaoai" && !audio;
    playSFX = this.streamResponse && ttsNotXiaoai && playSFX;

    if (ttsNotXiaoai && !stream) {
      // 长文本 TTS 转化成 stream 分段模式
      stream = StreamResponse.createStreamResponse(text!);
    }

    let res;
    this.responding = true;
    // 开始响应
    if (stream) {
      let replyText = "";
      while (true) {
        let { nextSentence, noMore } = stream.getNextResponse();
        if (!this.streamResponse) {
          nextSentence = await stream.getFinalResult();
          noMore = true;
        }
        if (nextSentence) {
          if (replyText.length < 1) {
            // 播放开始提示音
            if (playSFX && this.audioBeep) {
              if (this.debug) {
                this.logger.debug("开始播放提示音");
              }
              await this.MiNA!.play({ url: this.audioBeep });
            }
            // 在播放 TTS 语音之前，先取消小爱音箱的唤醒状态，防止将 TTS 语音识别成用户指令
            if (ttsNotXiaoai) {
              await this.unWakeUp();
            }
          }
          res = await this._response({
            ...options,
            text: nextSentence,
            playSFX: false,
            keepAlive: false,
          });
          if (res === "break") {
            // 终止回复
            stream.cancel();
            break;
          }
          replyText += nextSentence;
        }
        if (noMore) {
          if (replyText.length > 0) {
            // 播放结束提示音
            if (playSFX && this.audioBeep) {
              if (this.debug) {
                this.logger.debug("结束播放提示音");
              }
              await this.MiNA!.play({ url: this.audioBeep });
            }
          }
          // 保持唤醒状态
          if (keepAlive) {
            await this.wakeUp();
          }
          // 播放完毕
          break;
        }
        await sleep(this.checkInterval);
      }
      if (replyText.length < 1) {
        return "error";
      }
    } else {
      res = await this._response(options);
    }
    this.responding = false;
    return res;
  }

  private async _response(options: {
    tts?: TTSProvider;
    text?: string;
    audio?: string;
    speaker?: string;
    keepAlive?: boolean;
    playSFX?: boolean;
    hasNewMsg?: () => boolean;
  }) {
    let {
      text,
      audio,
      playSFX = true,
      keepAlive = false,
      tts = this.tts,
      speaker = this._currentSpeaker,
    } = options ?? {};

    const hasNewMsg = () => options.hasNewMsg?.();

    const ttsText = text?.replace(/\n\s*\n/g, "\n")?.trim();
    const ttsNotXiaoai = tts !== "xiaoai" && !audio;
    playSFX = this.streamResponse && ttsNotXiaoai && playSFX;

    // 播放回复
    const play = async (args?: { tts?: string; url?: string }) => {
      this.logger.log("🔊 " + (ttsText ?? audio));
      
      // 播放开始提示音
      if (playSFX && this.audioBeep) {
        if (this.debug) {
          this.logger.debug("开始播放提示音（inner）");
        }
        await this.MiNA!.play({ url: this.audioBeep });
      }
      
      // 优化 unWakeUp 调用
      if (ttsNotXiaoai) {
        await this.unWakeUp(); // 已经在方法内部添加了频率限制
      }
      
      // 添加错误处理和重试机制
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          if (args?.tts) {
            await this.MiIOT!.doAction(...this.ttsCommand, args.tts);
          } else if (args?.url) {
            await this.MiNA!.play(args);
          }
          break; // 成功则跳出循环
        } catch (error) {
          retryCount++;
          this.logger.error(`TTS/播放失败 (尝试 ${retryCount}/${maxRetries}):`, error);
          if (retryCount >= maxRetries) {
            this.logger.error('达到最大重试次数，放弃此次播放');
            return "error";
          }
          await sleep(500); // 等待500ms后重试
        }
      }
      
      // 删除这段重复代码
      // if (args?.tts) {
      //   await this.MiIOT!.doAction(...this.ttsCommand, args.tts);
      // } else {
      //   await this.MiNA!.play(args);
      // }
      
      if (!this.streamResponse) {
        // 非流式响应，直接返回，不再等待设备播放完毕
        // todo 考虑后续通过 MIoT 通知事件，接收设备播放状态变更通知。
        return;
      }
      // 等待一段时间，确保本地设备状态已更新
      await sleep(this.checkTTSStatusAfter * 1000);
      // 等待回答播放完毕
      const retry = fastRetry(this, "设备状态");
      while (true) {
        // 检测设备播放状态
        let playing: any = { status: "idle" };
        let res = this.playingCommand
          ? await this.MiIOT!.getProperty(
              this.playingCommand[0],
              this.playingCommand[1]
            )
          : await this.MiNA!.getStatus();
        if (this.debug) {
          this.logger.debug(jsonEncode({ playState: res ?? "undefined" }));
        }
        if (this.playingCommand && res === this.playingCommand[2]) {
          playing = { status: "playing" };
        }
        if (!this.playingCommand) {
          playing = { ...playing, ...res };
        }
        if (
          hasNewMsg() ||
          !this.responding || // 有新消息
          (playing.status === "playing" && playing.media_type) // 小爱自己开始播放音乐
        ) {
          // 响应被中断
          return "break";
        }
        const isOk = retry.onResponse(res);
        if (isOk === "break") {
          break; // 获取设备状态异常
        }
        if (res != null && playing.status !== "playing") {
          break;
        }
        await sleep(this.checkInterval);
      }
      // 播放结束提示音
      if (playSFX && this.audioBeep) {
        if (this.debug) {
          this.logger.debug("结束播放提示音（inner）");
        }
        await this.MiNA!.play({ url: this.audioBeep });
      }
      // 保持唤醒状态
      if (keepAlive) {
        await this.wakeUp();
      }
    };

    // 开始响应
    let res;
    if (audio) {
      // 优先播放音频回复
      res = await play({ url: audio });
    } else if (ttsText) {
      // 文字回复
      switch (tts) {
        case "custom":
            const _text = encodeURIComponent(ttsText);
            const url = `${process.env.TTS_BASE_URL}/are-you-ok/api/tts.mp3?speaker=${
                speaker || "S_TDTaLFJj1"
            }&text=${_text}`;
            
            this.logger.log('发送 TTS 请求:', url);
            try {
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'audio/mpeg'
                    }
                });
                this.logger.log('TTS 响应状态:', response.status);
                
                if (!response.ok) {
                    this.logger.error('TTS 请求失败:', response.statusText);
                    return "error";
                }
                
                // 验证响应内容类型
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('audio/mpeg')) {
                    this.logger.error('TTS 响应类型错误:', contentType);
                    return "error";
                }
                
                // 确保获取到音频数据
                const audioBlob = await response.blob();
                if (audioBlob.size === 0) {
                    this.logger.error('TTS 响应数据为空');
                    return "error";
                }
                // 创建临时 URL 用于播放
                const audioUrl = URL.createObjectURL(audioBlob);
                res = await play({ url: audioUrl });
                // 清理临时 URL
                URL.revokeObjectURL(audioUrl);
            } catch (error) {
                this.logger.error('TTS 请求异常:', error);
                return "error";
            }
            break;
        case "xiaoai":
        default:
          res = await play({ tts: ttsText });
          break;
      }
    }
    return res;
  }

  private _speakers?: Speaker[];
  private _currentSpeaker: string | undefined;
  async switchSpeaker(speaker: string) {
    if (!this._speakers && process.env.TTS_BASE_URL) {
      const resp = await fetch(`${process.env.TTS_BASE_URL}/are-you-ok/api/speakers`).catch(
        () => null
      );
      const res = await resp?.json().catch(() => null);
      if (Array.isArray(res)) {
        this._speakers = res;
      }
    }
    if (!this._speakers) {
      return false;
    }
    const target = this._speakers.find(
      (e) => e.name === speaker || e.speaker === speaker
    );
    if (target) {
      this._currentSpeaker = target.speaker;
      return true;
    }
  }
}
