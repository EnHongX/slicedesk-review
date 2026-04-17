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
  Row,
  Col,
  Progress,
  Alert,
  Tag,
  Tooltip,
  Collapse,
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
  InfoCircleOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
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
            播客音频处理
          </Title>
        }
        style={{ maxWidth: '1400px', margin: '0 auto' }}
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
          <Row gutter={[24, 24]}>
            <Col span={16}>
              <Card
                size="small"
                title={
                  <Space>
                    <InboxOutlined />
                    <Text strong>上传音频文件</Text>
                    <Tag color="red" style={{ marginLeft: '8px' }}>必填</Tag>
                  </Space>
                }
                style={{ height: '100%' }}
              >
                <Form.Item
                  name="audioFile"
                  style={{ marginBottom: 0 }}
                >
                  <Dragger {...uploadProps}>
                    {formData.audioFile ? (
                      <div style={{ padding: '30px' }}>
                        <AudioOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
                        <Paragraph style={{ marginTop: '20px', marginBottom: '8px', fontSize: '18px', fontWeight: '600' }}>
                          {formData.audioFile.name}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                          {formatFileSize(formData.audioFile.size)}
                        </Text>
                        <div style={{ marginTop: '16px' }}>
                          <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileChange(null);
                            }}
                            size="large"
                          >
                            更换文件
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '40px' }}>
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                          点击或拖拽音频文件到此处
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: '14px' }}>
                          <Space>
                            <Tag color="blue">MP3</Tag>
                            <Tag color="blue">WAV</Tag>
                            <Tag color="blue">OGG</Tag>
                            <Tag color="blue">M4A</Tag>
                            <Tag color="blue">AAC</Tag>
                            <Tag color="blue">FLAC</Tag>
                            <Text type="secondary">最大 100MB</Text>
                          </Space>
                        </p>
                      </div>
                    )}
                  </Dragger>
                </Form.Item>
              </Card>

              {uploadStatus === 'loading' && (
                <Card size="small" style={{ marginTop: '24px', background: '#e6f7ff' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Space>
                      <UploadOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                      <Text strong style={{ fontSize: '16px' }}>正在上传音频文件</Text>
                      <Text type="secondary">{uploadProgress}%</Text>
                    </Space>
                    <Progress
                      percent={uploadProgress}
                      status="active"
                      strokeColor={{
                        '0%': '#1890ff',
                        '100%': '#722ed1',
                      }}
                      strokeWidth={12}
                    />
                  </Space>
                </Card>
              )}
            </Col>

            <Col span={8}>
              <Card
                size="small"
                title={
                  <Space>
                    <ScissorOutlined />
                    <Text strong>选择处理方式</Text>
                  </Space>
                }
              >
                <Form.Item name="taskType" style={{ marginBottom: 0 }}>
                  <Radio.Group
                    value={formData.taskType}
                    onChange={handleTaskTypeChange}
                    style={{ width: '100%' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <Radio.Button
                        value="slice"
                        style={{
                          width: '100%',
                          height: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          borderRadius: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: formData.taskType === 'slice' ? 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)' : '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <ScissorOutlined style={{
                              fontSize: '24px',
                              color: formData.taskType === 'slice' ? 'white' : '#999',
                            }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>音频切片</div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              将音频按指定时长切分成多个片段
                            </Text>
                          </div>
                        </div>
                      </Radio.Button>

                      <Radio.Button
                        value="subtitle"
                        style={{
                          width: '100%',
                          height: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          borderRadius: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: formData.taskType === 'subtitle' ? 'linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)' : '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <FileTextOutlined style={{
                              fontSize: '24px',
                              color: formData.taskType === 'subtitle' ? 'white' : '#999',
                            }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>字幕生成</div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              自动识别音频内容生成中文字幕
                            </Text>
                          </div>
                        </div>
                      </Radio.Button>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Card>

              <Card
                size="small"
                title={
                  <Space>
                    <InfoCircleOutlined />
                    <Text strong>节目信息</Text>
                  </Space>
                }
                style={{ marginTop: '24px' }}
              >
                <Form.Item
                  name="programName"
                  label={<Text strong>节目名称</Text>}
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
                    prefix={<Tag color="purple">节目</Tag>}
                  />
                </Form.Item>

                <Form.Item
                  name="episodeNumber"
                  label={<Text strong>期数</Text>}
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
                    addonBefore={<Tag color="magenta">期</Tag>}
                  />
                </Form.Item>

                {formData.taskType === 'slice' && (
                  <Form.Item
                    name="sliceDurationSeconds"
                    label={
                      <Space>
                        <Text strong>切片时长</Text>
                        <Tooltip title="每段音频的时长，单位：秒">
                          <InfoCircleOutlined style={{ color: '#999' }} />
                        </Tooltip>
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
                )}
              </Card>

              <Card
                size="small"
                style={{ marginTop: '24px', background: 'linear-gradient(135deg, #f0f5ff 0%, #faf5ff 100%)' }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <ThunderboltOutlined style={{ color: '#1890ff' }} />
                        <Text strong>快速处理</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        平均处理时间 30 秒
                      </Text>
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <SafetyOutlined style={{ color: '#52c41a' }} />
                        <Text strong>安全可靠</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        数据加密传输存储
                      </Text>
                    </Space>
                  </Col>
                </Row>
              </Card>

              <Collapse
                defaultActiveKey={[]}
                style={{ marginTop: '24px' }}
                size="small"
              >
                <Collapse.Panel
                  header={
                    <Space>
                      <InfoCircleOutlined />
                      <Text strong>支持的音频格式</Text>
                    </Space>
                  }
                  key="audio-formats"
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f0f5ff' }}>
                        <AudioOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                        <div style={{ marginTop: '4px', fontWeight: '600', fontSize: '14px' }}>MP3</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>最常用格式</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                        <AudioOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                        <div style={{ marginTop: '4px', fontWeight: '600', fontSize: '14px' }}>WAV</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>无损音质</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f9f0ff' }}>
                        <AudioOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
                        <div style={{ marginTop: '4px', fontWeight: '600', fontSize: '14px' }}>OGG</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>开源格式</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
                        <AudioOutlined style={{ fontSize: '20px', color: '#fa8c16' }} />
                        <div style={{ marginTop: '4px', fontWeight: '600', fontSize: '14px' }}>M4A</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>Apple 格式</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#e6fffb' }}>
                        <AudioOutlined style={{ fontSize: '20px', color: '#13c2c2' }} />
                        <div style={{ marginTop: '4px', fontWeight: '600', fontSize: '14px' }}>AAC</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>高效压缩</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#fff1f0' }}>
                        <AudioOutlined style={{ fontSize: '20px', color: '#f5222d' }} />
                        <div style={{ marginTop: '4px', fontWeight: '600', fontSize: '14px' }}>FLAC</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>自由无损</Text>
                      </Card>
                    </Col>
                  </Row>
                </Collapse.Panel>
              </Collapse>

              <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={uploadStatus === 'loading'}
                  style={{
                    width: '100%',
                    height: '52px',
                    fontSize: '16px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none',
                  }}
                  icon={<UploadOutlined />}
                >
                  {uploadStatus === 'loading'
                    ? `上传中 (${uploadProgress}%)`
                    : uploadStatus === 'success'
                    ? '重新上传'
                    : '开始处理'
                  }
                </Button>
              </Form.Item>
            </Col>
          </Row>

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
              style={{ marginTop: '24px' }}
            />
          )}

          {uploadStatus === 'error' && errorMessage && (
            <Alert
              message="上传失败"
              description={errorMessage}
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
              style={{ marginTop: '24px' }}
            />
          )}
        </Form>
      </Card>
    </>
  );
};

export default UploadForm;
