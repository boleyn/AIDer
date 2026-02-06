import { defaultQAModels, defaultVectorModels } from '@fastgpt/global/core/ai/model';
import {
  DatasetCollectionDataProcessModeEnum,
  DatasetCollectionTypeEnum,
  DatasetTypeEnum
} from '@fastgpt/global/core/dataset/constants';
import type {
  DatasetCollectionItemType,
  DatasetItemType
} from '@fastgpt/global/core/dataset/type.d';
import { DatasetPermission } from '@fastgpt/global/support/permission/dataset/controller';
export const defaultDatasetDetail: DatasetItemType = {
  _id: '',
  parentId: '',
  userId: '',
  teamId: '',
  tmbId: '',
  updateTime: new Date(),
  type: DatasetTypeEnum.dataset,
  avatar: '/icon/logo.svg',
  name: '',
  intro: '',
  status: 'active',
  permission: new DatasetPermission(),
  vectorModel: defaultVectorModels[0],
  agentModel: defaultQAModels[0],
  vlmModel: defaultQAModels[0],
  inheritPermission: true
};

export const defaultCollectionDetail: DatasetCollectionItemType = {
  _id: '',
  teamId: '',
  tmbId: '',
  datasetId: '',
  dataset: {
    _id: '',
    parentId: '',
    userId: '',
    teamId: '',
    tmbId: '',
    updateTime: new Date(),
    type: DatasetTypeEnum.dataset,
    avatar: '/icon/logo.svg',
    name: '',
    intro: '',
    vectorModel: defaultVectorModels[0].model,
    agentModel: defaultQAModels[0].model,
    inheritPermission: true
  },
  tags: [],
  parentId: '',
  name: '',
  type: DatasetCollectionTypeEnum.file,
  updateTime: new Date(),
  sourceName: '',
  sourceId: '',
  createTime: new Date(),
  trainingType: DatasetCollectionDataProcessModeEnum.chunk,
  chunkSize: 0,
  indexSize: 512,
  permission: new DatasetPermission(),
  indexAmount: 0
};

export const TrainingProcess = {
  waiting: { label: '等待中', value: 'waiting' },
  parsing: { label: '解析中', value: 'parsing' },
  parseImage: { label: '解析图片', value: 'parseImage' },
  getQA: { label: '生成问答', value: 'getQA' },
  imageIndex: { label: '图片索引', value: 'imageIndex' },
  autoIndex: { label: '自动索引', value: 'autoIndex' },
  vectorizing: { label: '向量化', value: 'vectorizing' },
  isReady: { label: '已完成', value: 'isReady' }
};
