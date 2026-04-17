import React, { useState, useCallback } from 'react';
import {
  Card,
  Tabs,
  Button,
  Table,
  Space,
  Tag,
  Alert,
  Row,
  Col,
  Typography,
  message,
  Divider,
  Radio,
  RadioChangeEvent,
} from 'antd';
import {
  DownloadOutlined,
  CopyOutlined,
  TranslationOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  NumberOutlined,
} from '@ant-design/icons';
import { SubtitleSegment, SubtitleResponse, TranslatedSegment, TranslationResponse } from '../types';
import { convertToSRT, downloadSRT } from '../utils/subtitleUtils';
import { uploadService } from '../api/uploadService';

const { Title, Text, Paragraph } = Typography;

interface SubtitleListProps {
  subtitleData: SubtitleResponse;
  taskInfo?: {
    programName: string;
    episodeNumber: string;
    fileName: string;
  };
}

type DisplayMode = 'original' | 'translated' | 'bilingual';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(2)} 秒`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} 分 ${secs} 秒`;
}

const SubtitleList: React.FC<SubtitleListProps> = ({ subtitleData, taskInfo }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationData, setTranslationData] = useState<TranslationResponse | null>(null);
  const [translationError, setTranslationError] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('original');

  const segments = subtitleData.data?.segments || [];
  const fullText = subtitleData.data?.fullText || '';
  const totalDuration = subtitleData.data?.totalDuration || 0;
  const segmentCount = subtitleData.data?.segmentCount || 0;
  const taskId = subtitleData.data?.taskId;

  const generateFileName = useCallback((suffix: string = '') => {
    const baseName = (() => {
      if (taskInfo?.programName && taskInfo?.episodeNumber) {
        return `${taskInfo.programName}_第${taskInfo.episodeNumber}期`;
      }
      if (taskInfo?.fileName) {
        return taskInfo.fileName.replace(/\.[^/.]+$/, '');
      }
      return 'subtitle';
    })();
    return suffix ? `${baseName}_${suffix}.srt` : `${baseName}.srt`;
  }, [taskInfo]);

  const handleExportSRT = useCallback((isEnglish: boolean = false) => {
    try {
      let exportSegments: SubtitleSegment[];
      let fileName: string;
      
      if (isEnglish && translationData?.data) {
        exportSegments = translationData.data.segments.map((seg: TranslatedSegment) => ({
          index: seg.index,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.translatedText,
          confidence: seg.confidence
        }));
        fileName = generateFileName('en');
      } else {
        exportSegments = segments;
        fileName = generateFileName();
      }
      
      const srtContent = convertToSRT(exportSegments);
      downloadSRT(srtContent, fileName);
      messageApi.success(`已导出 ${isEnglish ? '英文' : '中文'} 字幕文件`);
    } catch (err) {
      console.error('导出失败:', err);
      messageApi.error('导出失败，请重试');
    }
  }, [segments, translationData, generateFileName, messageApi]);

  const handleCopyFullText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      messageApi.success('已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      messageApi.error('复制失败，请重试');
    }
  }, [messageApi]);

  const handleCopySegment = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      messageApi.success('已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      messageApi.error('复制失败，请重试');
    }
  }, [messageApi]);

  const handleTranslate = useCallback(async () => {
    if (isTranslating) return;
    
    if (!taskId) {
      setTranslationError('无法获取任务ID，请刷新页面重试');
      console.error('翻译失败: taskId 不存在', subtitleData);
      return;
    }
    
    setIsTranslating(true);
    setTranslationError('');
    
    console.log('开始翻译，taskId:', taskId);
    
    try {
      const response = await uploadService.getTaskTranslation(taskId, 'en');
      
      console.log('翻译API响应:', response);
      
      if (response.success && response.data) {
        setTranslationData(response);
        setDisplayMode('bilingual');
        messageApi.success('翻译完成！');
        console.log('翻译成功，数据已回填');
      } else {
        setTranslationError(response.message || '翻译失败');
        console.error('翻译失败，响应不成功:', response);
      }
    } catch (err) {
      const error = err as { message?: string; code?: string };
      setTranslationError(error.message || '翻译失败，请稍后重试');
      console.error('翻译请求异常:', err, 'code:', error.code);
    } finally {
      setIsTranslating(false);
    }
  }, [taskId, isTranslating, subtitleData, messageApi]);

  const getTranslatedSegment = (index: number): TranslatedSegment | undefined => {
    return translationData?.data?.segments.find(seg => seg.index === index);
  };

  const getDisplayLanguageLabel = () => {
    switch (displayMode) {
      case 'original':
        return '中文';
      case 'translated':
        return '英文';
      case 'bilingual':
        return '双语对照';
    }
  };

  const handleDisplayModeChange = (e: RadioChangeEvent) => {
    setDisplayMode(e.target.value as DisplayMode);
  };

  const tableColumns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
          {index + 1}
        </Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 140,
      render: (time: number) => formatTime(time),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 140,
      render: (time: number) => formatTime(time),
    },
    ...(displayMode === 'bilingual'
      ? [
          {
            title: '中文原文',
            dataIndex: 'text',
            key: 'text',
            render: (text: string) => (
              <Text style={{ fontSize: '14px', lineHeight: '1.6' }}>{text}</Text>
            ),
          },
          {
            title: '英文译文',
            key: 'translatedText',
            render: (_: unknown, record: SubtitleSegment & { translatedText?: string }) => {
              const translatedSeg = getTranslatedSegment(record.index);
              return (
                <Text type="secondary" style={{ fontSize: '14px', lineHeight: '1.6', fontStyle: 'italic' }}>
                  {translatedSeg?.translatedText || '-'}
                </Text>
              );
            },
          },
        ]
      : [
          {
            title: displayMode === 'translated' ? '英文译文' : '字幕内容',
            key: 'displayText',
            render: (_: unknown, record: SubtitleSegment) => {
              const translatedSeg = getTranslatedSegment(record.index);
              const displayText =
                displayMode === 'translated' && translatedSeg
                  ? translatedSeg.translatedText
                  : record.text;
              return <Text style={{ fontSize: '14px', lineHeight: '1.6' }}>{displayText}</Text>;
            },
          },
        ]),
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: SubtitleSegment) => {
        const translatedSeg = getTranslatedSegment(record.index);
        const textToCopy =
          displayMode === 'translated' && translatedSeg
            ? translatedSeg.translatedText
            : record.text;
        return (
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => handleCopySegment(textToCopy)}
            size="small"
          >
            复制
          </Button>
        );
      },
    },
  ];

  if (segments.length === 0 && !fullText) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">暂无字幕数据</Text>
        </div>
      </Card>
    );
  }

  const tabItems = [
    {
      key: 'fulltext',
      label: (
        <span>
          <FileTextOutlined /> 完整文本
        </span>
      ),
      children: (
        <Card size="small">
          {displayMode === 'bilingual' && translationData?.data ? (
            <Row gutter={24}>
              <Col span={12}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <GlobalOutlined />
                      <span>中文原文</span>
                    </Space>
                  }
                  extra={
                    <Button
                      type="primary"
                      ghost
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyFullText(fullText)}
                      size="small"
                    >
                      一键复制
                    </Button>
                  }
                >
                  <Paragraph
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '15px',
                      lineHeight: '1.8',
                      margin: 0,
                    }}
                  >
                    {fullText}
                  </Paragraph>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <TranslationOutlined />
                      <span>英文译文</span>
                    </Space>
                  }
                  extra={
                    <Button
                      type="primary"
                      ghost
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyFullText(translationData.data!.fullTranslatedText)}
                      size="small"
                    >
                      一键复制
                    </Button>
                  }
                >
                  <Paragraph
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '15px',
                      lineHeight: '1.8',
                      margin: 0,
                      fontStyle: 'italic',
                    }}
                    type="secondary"
                  >
                    {translationData.data.fullTranslatedText}
                  </Paragraph>
                </Card>
              </Col>
            </Row>
          ) : (
            <Card
              size="small"
              title={
                <Space>
                  <FileTextOutlined />
                  <span>
                    {displayMode === 'translated' ? '完整英文文本' : '完整字幕文本'}
                  </span>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  ghost
                  icon={<CopyOutlined />}
                  onClick={() =>
                    handleCopyFullText(
                      displayMode === 'translated' && translationData?.data
                        ? translationData.data.fullTranslatedText
                        : fullText
                    )
                  }
                  size="small"
                >
                  一键复制
                </Button>
              }
            >
              <Paragraph
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '15px',
                  lineHeight: '1.8',
                  margin: 0,
                }}
              >
                {displayMode === 'translated' && translationData?.data
                  ? translationData.data.fullTranslatedText
                  : fullText}
              </Paragraph>
            </Card>
          )}
        </Card>
      ),
    },
    {
      key: 'segments',
      label: (
        <span>
          <ScheduleOutlined /> 分段字幕
        </span>
      ),
      children: (
        <Card size="small">
          <Table
            columns={tableColumns}
            dataSource={segments}
            rowKey="index"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 段字幕`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 800 }}
          />
        </Card>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Title level={3} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: '8px' }} />
            字幕生成结果
          </Title>
        }
        extra={
          <Space>
            {translationData && (
              <Radio.Group value={displayMode} onChange={handleDisplayModeChange} buttonStyle="solid">
                <Radio.Button value="original">
                  <GlobalOutlined /> 中文
                </Radio.Button>
                <Radio.Button value="translated">
                  <TranslationOutlined /> 英文
                </Radio.Button>
                <Radio.Button value="bilingual">
                  <CheckCircleOutlined /> 双语对照
                </Radio.Button>
              </Radio.Group>
            )}
          </Space>
        }
      >
        {taskInfo && (
          <>
            <Row gutter={[16, 8]} style={{ marginBottom: '16px' }}>
              <Col span={8}>
                <Space>
                  <Text strong>节目：</Text>
                  <Tag color="purple">{taskInfo.programName}</Tag>
                </Space>
              </Col>
              <Col span={8}>
                <Space>
                  <Text strong>期数：</Text>
                  <Tag color="magenta">第 {taskInfo.episodeNumber} 期</Tag>
                </Space>
              </Col>
              <Col span={8}>
                <Space>
                  <Text strong>文件：</Text>
                  <Text ellipsis style={{ maxWidth: '200px' }}>
                    {taskInfo.fileName}
                  </Text>
                </Space>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
          </>
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
              <NumberOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>片段数量</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  {segmentCount} 段
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
              <ScheduleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>总时长</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  {formatDuration(totalDuration)}
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
              <GlobalOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>当前语言</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                  {getDisplayLanguageLabel()}
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {!translationData ? (
                  <Button
                    type="primary"
                    icon={<TranslationOutlined />}
                    onClick={handleTranslate}
                    loading={isTranslating}
                    disabled={!taskId}
                    style={{ width: '100%' }}
                    size="large"
                  >
                    {isTranslating ? '翻译中...' : '转换为英文'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => handleExportSRT(true)}
                      style={{ width: '100%' }}
                    >
                      导出英文 SRT
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleExportSRT(false)}
                      style={{ width: '100%' }}
                    >
                      导出中文 SRT
                    </Button>
                  </>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {translationError && (
          <Alert
            message="翻译失败"
            description={translationError}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        <Tabs defaultActiveKey="fulltext" items={tabItems} />
      </Card>
    </>
  );
};

export default SubtitleList;
