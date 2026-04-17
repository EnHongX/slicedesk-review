import React, { useState, useRef, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Radio,
  Button,
  Upload,
  Space,
  Typography,
  message,
  Divider,
  Row,
  Col,
  Progress,
  Alert,
} from 'antd';
import {
  UploadOutlined,
  AudioOutlined,
  ScissorOutlined,
  FileTextOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { UploadFormData, UploadStatus, UploadResponse, UploadError, SlicesResponse, SubtitleResponse } from '../types';
import { validationUtils, formatFileSize } from '../utils/validation';
import { uploadService } from '../api/uploadService';
import SliceList from './SliceList';
import SubtitleList from './SubtitleList';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const UploadForm: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [formData, setFormData] = useState<UploadFormData>({
    audioFile: null,
    programName: '',
    episodeNumber: '',
    sliceDurationSeconds: '60',
    taskType: 'slice'
  });

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [successResponse, setSuccessResponse] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [slicesData, setSlicesData] = useState<SlicesResponse | null>(null);
  const [showSlices, setShowSlices] = useState<boolean>(false);
  const [loadingSlices, setLoadingSlices] = useState<boolean>(false);
  const [subtitleData, setSubtitleData] = useState<SubtitleResponse | null>(null);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(false);
  const [loadingSubtitles, setLoadingSubtitles] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTaskTypeChange = (e: any) => {
    setFormData(prev => ({ ...prev, taskType: e.target.value }));
  };

  const handleFileChange = useCallback((file: File | null) => {
    setFormData(prev => ({ ...prev, audioFile: file }));
  }, []);

  const loadSlices = async (taskId: string) => {
    setLoadingSlices(true);
    try {
      const response = await uploadService.getTaskSlices(taskId);
      setSlicesData(response);
      setShowSlices(true);
    } catch (err) {
      const error = err as UploadError;
      console.error('获取切片列表失败:', error.message);
      messageApi.error('获取切片列表失败');
    } finally {
      setLoadingSlices(false);
    }
  };

  const loadSubtitles = async (taskId: string) => {
    setLoadingSubtitles(true);
    try {
      const response = await uploadService.getTaskSubtitles(taskId);
      setSubtitleData(response);
      setShowSubtitles(true);
    } catch (err) {
      const error = err as UploadError;
      console.error('获取字幕失败:', error.message);
      messageApi.error('获取字幕失败');
    } finally {
      setLoadingSubtitles(false);
    }
  };

  const handleSubmit = async (_values: any) => {
    const validationErrors = validationUtils.validateForm(formData);

    if (validationUtils.hasErrors(validationErrors)) {
      if (validationErrors.audioFile) {
        messageApi.error(validationErrors.audioFile);
      }
      if (validationErrors.programName) {
        messageApi.error(validationErrors.programName);
      }
      if (validationErrors.episodeNumber) {
        messageApi.error(validationErrors.episodeNumber);
      }
      return;
    }

    setUploadStatus('loading');
    setUploadProgress(0);
    setSuccessResponse(null);
    setErrorMessage('');
    setSlicesData(null);
    setShowSlices(false);
    setSubtitleData(null);
    setShowSubtitles(false);

    try {
      const response = await uploadService.uploadAudio(formData, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus('success');
      setSuccessResponse(response);
      messageApi.success('上传成功！');

      if (response.data?.taskId) {
        if (formData.taskType === 'slice') {
          await loadSlices(response.data.taskId);
        } else if (formData.taskType === 'subtitle') {
          await loadSubtitles(response.data.taskId);
        }
      }
    } catch (err) {
      const error = err as UploadError;
      setUploadStatus('error');
      setErrorMessage(error.message);
      messageApi.error(error.message);
    }
  };

  const handleReset = () => {
    setFormData({
      audioFile: null,
      programName: '',
      episodeNumber: '',
      sliceDurationSeconds: '60',
      taskType: 'slice'
    });
    form.resetFields();
    setUploadStatus('idle');
    setUploadProgress(0);
    setSuccessResponse(null);
    setErrorMessage('');
    setSlicesData(null);
    setShowSlices(false);
    setSubtitleData(null);
    setShowSubtitles(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showResults = showSlices || showSubtitles;
  const isLoadingResults = loadingSlices || loadingSubtitles;

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*',
    beforeUpload: (file: File) => {
      const error = validationUtils.validateAudioFile(file);
      if (error) {
        messageApi.error(error);
        return false;
      }
      handleFileChange(file);
      return false;
    },
    showUploadList: false,
    disabled: uploadStatus === 'loading',
  };

  if (showResults) {
    return (
      <>
        {contextHolder}
        {showSlices && slicesData && slicesData.data && (
          <div className="slices-section">
            <SliceList
              slices={slicesData.data.slices}
              totalDuration={slicesData.data.totalDuration}
              sliceCount={slicesData.data.sliceCount}
              sliceDurationSeconds={slicesData.data.sliceDurationSeconds}
              taskInfo={
                successResponse?.data
                  ? {
                      programName: successResponse.data.programName,
                      episodeNumber: successResponse.data.episodeNumber,
                      fileName: successResponse.data.fileName
                    }
                  : undefined
              }
            />
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleReset}
                size="large"
              >
                返回上传
              </Button>
            </div>
          </div>
        )}

        {showSubtitles && subtitleData && subtitleData.data && (
          <div className="subtitle-section">
            <SubtitleList
              subtitleData={subtitleData}
              taskInfo={
                successResponse?.data
                  ? {
                      programName: successResponse.data.programName,
                      episodeNumber: successResponse.data.episodeNumber,
                      fileName: successResponse.data.fileName
                    }
                  : undefined
              }
            />
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleReset}
                size="large"
              >
                返回上传
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Title level={3} style={{ margin: 0 }}>
            <AudioOutlined style={{ marginRight: '8px' }} />
            播客音频上传
          </Title>
        }
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            taskType: 'slice',
            sliceDurationSeconds: 60,
          }}
        >
          <Form.Item
            name="audioFile"
            label={
              <Space>
                <InboxOutlined />
                <Text strong>音频文件</Text>
              </Space>
            }
            rules={[
              { required: true, message: '请选择音频文件' },
            ]}
            validateStatus={formData.audioFile ? 'success' : 'error'}
            help={
              formData.audioFile ? '' : '支持 MP3、WAV、OGG、M4A、AAC、FLAC 格式，最大 100MB'
            }
          >
            <Dragger {...uploadProps}>
              {formData.audioFile ? (
                <div style={{ padding: '20px' }}>
                  <AudioOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                  <Paragraph style={{ marginTop: '16px', marginBottom: '8px', fontSize: '16px', fontWeight: '500' }}>
                    {formData.audioFile.name}
                  </Paragraph>
                  <Text type="secondary">{formatFileSize(formData.audioFile.size)}</Text>
                  <div style={{ marginTop: '12px' }}>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileChange(null);
                      }}
                    >
                      更换文件
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px' }}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontSize: '16px' }}>
                    点击或拖拽音频文件到此处
                  </p>
                  <p className="ant-upload-hint">
                    支持 MP3、WAV、OGG、M4A、AAC、FLAC 格式，最大 100MB
                  </p>
                </div>
              )}
            </Dragger>
          </Form.Item>

          <Divider />

          <Form.Item
            name="taskType"
            label={
              <Space>
                <ScissorOutlined />
                <Text strong>处理方式</Text>
              </Space>
            }
          >
            <Radio.Group
              value={formData.taskType}
              onChange={handleTaskTypeChange}
              style={{ width: '100%' }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Radio.Button
                    value="slice"
                    style={{
                      width: '100%',
                      height: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <ScissorOutlined style={{ fontSize: '32px', color: formData.taskType === 'slice' ? '#1890ff' : '#999' }} />
                      <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: '600' }}>切片</div>
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                        将音频按指定时长切分成多个片段
                      </div>
                    </div>
                  </Radio.Button>
                </Col>
                <Col span={12}>
                  <Radio.Button
                    value="subtitle"
                    style={{
                      width: '100%',
                      height: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <FileTextOutlined style={{ fontSize: '32px', color: formData.taskType === 'subtitle' ? '#1890ff' : '#999' }} />
                      <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: '600' }}>字幕生成</div>
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                        自动识别音频内容生成中文字幕
                      </div>
                    </div>
                  </Radio.Button>
                </Col>
              </Row>
            </Radio.Group>
          </Form.Item>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="programName"
                label={
                  <Space>
                    <Text strong>节目名称</Text>
                  </Space>
                }
                rules={[
                  { required: true, message: '请输入节目名称' },
                ]}
              >
                <Input
                  placeholder="例如：科技前沿播客"
                  size="large"
                  value={formData.programName}
                  onChange={(e) => setFormData(prev => ({ ...prev, programName: e.target.value }))}
                  disabled={uploadStatus === 'loading'}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="episodeNumber"
                label={
                  <Space>
                    <Text strong>期数</Text>
                  </Space>
                }
                rules={[
                  { required: true, message: '请输入期数' },
                ]}
              >
                <InputNumber
                  placeholder="例如：1"
                  min={1}
                  size="large"
                  style={{ width: '100%' }}
                  value={formData.episodeNumber ? parseInt(formData.episodeNumber) : undefined}
                  onChange={(value) => setFormData(prev => ({ ...prev, episodeNumber: value?.toString() || '' }))}
                  disabled={uploadStatus === 'loading'}
                />
              </Form.Item>
            </Col>
          </Row>

          {formData.taskType === 'slice' && (
            <>
              <Divider />
              <Form.Item
                name="sliceDurationSeconds"
                label={
                  <Space>
                    <Text strong>切片时长（秒）</Text>
                  </Space>
                }
                rules={[
                  { required: true, message: '请输入切片时长' },
                ]}
              >
                <InputNumber
                  placeholder="例如：60"
                  min={1}
                  max={3600}
                  size="large"
                  style={{ width: '100%' }}
                  addonAfter="秒"
                  value={formData.sliceDurationSeconds ? parseInt(formData.sliceDurationSeconds) : 60}
                  onChange={(value) => setFormData(prev => ({ ...prev, sliceDurationSeconds: value?.toString() || '60' }))}
                  disabled={uploadStatus === 'loading'}
                />
              </Form.Item>
            </>
          )}

          <Divider />

          {uploadStatus === 'loading' && (
            <Alert
              message={
              <Space>
                <span>上传进度</span>
                <Text type="secondary">{uploadProgress}%</Text>
              </Space>
            }
              description={
              <Progress
                percent={uploadProgress}
                status="active"
                showInfo={false}
              />
            }
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {uploadStatus === 'success' && successResponse && !showSlices && !showSubtitles && (
            <Alert
              message="上传成功！"
              description={
                <div>
                  <p>任务ID：{successResponse.data?.taskId}</p>
                  <p>节目：{successResponse.data?.programName} | 第 {successResponse.data?.episodeNumber} 期</p>
                  <p>当前状态：{successResponse.data?.status}</p>
                  {isLoadingResults && <p style={{ color: '#1890ff', marginTop: '8px' }}>正在加载{formData.taskType === 'slice' ? '切片' : '字幕'}...</p>}
                </div>
              }
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: '16px' }}
            />
          )}

          {uploadStatus === 'error' && errorMessage && (
            <Alert
              message="上传失败"
              description={errorMessage}
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
              style={{ marginBottom: '16px' }}
            />
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={uploadStatus === 'loading'}
              style={{ width: '100%', height: '48px', fontSize: '16px' }}
              icon={<UploadOutlined />}
            >
              {uploadStatus === 'loading'
                ? `上传中 (${uploadProgress}%)`
                : uploadStatus === 'success'
                ? '重新上传'
                : '提交上传'
              }
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default UploadForm;
