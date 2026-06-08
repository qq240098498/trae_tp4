# 驾校学员学时管理系统 - 启动方式文档

## 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

## 安装依赖

```bash
npm install
```

## 启动开发服务器

```bash
npm run dev
```

启动后：
- 前端地址：http://localhost:5173
- 后端地址：http://localhost:3001

前端会通过 Vite 代理自动转发 `/api` 请求到后端。

## 单独启动

仅启动前端：
```bash
npm run client:dev
```

仅启动后端：
```bash
npm run server:dev
```

## 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 默认登录账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 教练 | coach1 | coach123 |
| 教练 | coach2 | coach123 |
| 教练 | coach3 | coach123 |

## 功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 仪表盘 | / | 数据概览、预警列表、快捷操作 |
| 学员档案 | /students | 学员CRUD、搜索筛选、分页 |
| 学员详情 | /students/:id | 个人信息、培训进度、学时明细 |
| 课程排班 | /scheduling | 周视图日历、新建排班、学员预约 |
| 签到打卡 | /attendance | 签到/签退操作、签到记录查询 |
| 学时统计 | /statistics | 批量统计图表、个人学时进度 |
| 学时提醒 | /alerts | 预警列表、规则配置 |
| 记录导出 | /export | 导出Excel、导出历史 |

## API接口

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 认证 | /api/auth | 登录、获取用户信息 |
| 学员 | /api/students | 学员CRUD |
| 教练 | /api/coaches | 教练CRUD |
| 排班 | /api/schedules | 排班CRUD、预约管理 |
| 签到 | /api/attendance | 签到/签退、记录查询 |
| 统计 | /api/statistics | 概览、个人/批量统计 |
| 预警 | /api/alerts | 预警列表、规则管理 |
| 导出 | /api/export | Excel导出、历史记录 |

## 数据存储

- 数据库类型：SQLite（通过 sql.js WASM 实现）
- 数据库文件：`./data/driving-school.db`
- 导出文件目录：`./data/exports/`
- 首次启动自动创建数据库和初始数据

## 技术栈

- **前端**：React 18 + TypeScript + TailwindCSS + Zustand + React Router DOM
- **后端**：Express 4 + TypeScript (ESM)
- **数据库**：SQLite (sql.js)
- **图表**：Recharts
- **导出**：xlsx
- **图标**：lucide-react
- **鉴权**：JWT (jsonwebtoken)
