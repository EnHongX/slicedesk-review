import { UploadFormData, UploadFormErrors } from '../types';

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac'
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const validationUtils = {
  validateAudioFile(file: File | null): string | undefined {
    if (!file) {
      return '请选择音频文件';
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return '文件格式不支持，请上传 MP3、WAV、OGG、M4A、AAC 或 FLAC 格式的音频文件';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `文件过大，请上传小于 100MB 的音频文件（当前文件：${formatFileSize(file.size)}）`;
    }

    return undefined;
  },

  validateProgramName(name: string): string | undefined {
    if (!name || name.trim() === '') {
      return '请输入节目名称';
    }

    if (name.length > 100) {
      return '节目名称不能超过 100 个字符';
    }

    return undefined;
  },

  validateEpisodeNumber(episode: string): string | undefined {
    if (!episode || episode.trim() === '') {
      return '请输入期数';
    }

    const episodeNum = parseInt(episode, 10);
    
    if (isNaN(episodeNum)) {
      return '期数必须是有效的数字';
    }

    if (episodeNum < 1) {
      return '期数必须大于 0';
    }

    if (episodeNum > 99999) {
      return '期数不能超过 99999';
    }

    return undefined;
  },

  validateSliceDurationSeconds(duration: string): string | undefined {
    if (!duration || duration.trim() === '') {
      return '请输入切片时长';
    }

    const durationNum = parseFloat(duration);
    
    if (isNaN(durationNum)) {
      return '切片时长必须是有效的数字';
    }

    if (durationNum <= 0) {
      return '切片时长必须大于 0';
    }

    if (durationNum > 3600) {
      return '切片时长不能超过 3600 秒（1小时）';
    }

    return undefined;
  },

  validateForm(formData: UploadFormData): UploadFormErrors {
    const errors: UploadFormErrors = {};

    const audioError = this.validateAudioFile(formData.audioFile);
    if (audioError) {
      errors.audioFile = audioError;
    }

    const programError = this.validateProgramName(formData.programName);
    if (programError) {
      errors.programName = programError;
    }

    const episodeError = this.validateEpisodeNumber(formData.episodeNumber);
    if (episodeError) {
      errors.episodeNumber = episodeError;
    }

    const sliceDurationError = this.validateSliceDurationSeconds(formData.sliceDurationSeconds);
    if (sliceDurationError) {
      errors.sliceDurationSeconds = sliceDurationError;
    }

    return errors;
  },

  hasErrors(errors: UploadFormErrors): boolean {
    return Object.keys(errors).length > 0;
  }
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
