import React from 'react';
import { Card, Table, Row, Col, Tag, Space, Typography } from 'antd';
import { ScissorOutlined, ScheduleOutlined, NumberOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { SliceInfo } from '../types';

const { Title, Text } = Typography;

interface SliceListProps {
  slices: SliceInfo[];
  totalDuration: number;
  sliceCount: number;
  sliceDurationSeconds: number;
  taskInfo?: {
    programName: string;
    episodeNumber: string;
    fileName: string;
  };
}

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

const SliceList: React.FC<SliceListProps> = ({ slices, totalDuration, sliceCount, sliceDurationSeconds, taskInfo }) => {
  const columns = [
    {
      title: '序号',
      dataIndex: 'sliceIndex',
      key: 'sliceIndex',
      width: 80,
      align: 'center' as const,
      render: (index: number) => (
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
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (time: number) => formatDuration(time),
    },
  ];

  if (slices.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">暂无切片数据</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Title level={3} style={{ margin: 0 }}>
          <ScissorOutlined style={{ marginRight: '8px' }} />
          切片结果列表
        </Title>
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
          <div style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />
        </>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
            <NumberOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>切片数量</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                {sliceCount} 段
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
            <ScheduleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>切片时长</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                {formatDuration(sliceDurationSeconds)}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
            <ClockCircleOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>总时长</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                {formatDuration(totalDuration)}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={slices}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个切片`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 500 }}
        />
      </Card>
    </Card>
  );
};

export default SliceList;
