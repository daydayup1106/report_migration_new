# 🚀 Windows 启动指南

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:4000 |
| 后端 API | http://localhost:9000 |
| API 文档 | http://localhost:9000/api/docs |

---

## 一键启动

在项目根目录双击 `start.bat`，脚本会自动检查 MongoDB 并依次启动后端和前端。

> ⚠️ 前提：MongoDB 必须已在运行状态，否则脚本会中止。

---

## 首次安装（仅第一次需要执行）

### 1. 创建并配置后端环境

```powershell
cd D:\development\PyCharmWorkSpace\report_migration_new\backend

# 创建 conda 虚拟环境
conda create -n report_migration_new python=3.11 -y

# 激活环境
conda activate report_migration_new

# 安装 Python 依赖
pip install -r requirements.txt

# 复制环境变量模板
copy .env.example .env
```

然后编辑 `backend/.env`，填入你的 Anthropic API Key：

```ini
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 2. 安装前端依赖

```powershell
cd D:\development\PyCharmWorkSpace\report_migration_new\frontend

npm install
```

### 3. 准备 MongoDB 数据目录

```powershell
# 如果 C:\data\db 目录不存在，先创建
New-Item -ItemType Directory -Force -Path C:\data\db
```

---

## 手动启动步骤


### 第一步：启动 MongoDB

```powershell
# 方式一：作为 Windows 服务启动
net start MongoDB

# 方式二：手动指定数据目录
mongod --dbpath C:\data\db
```

验证是否成功：

```powershell
tasklist | findstr mongod
```

---

### 第二步：启动后端

打开一个新的 PowerShell/CMD 窗口：

```powershell
cd D:\development\PyCharmWorkSpace\report_migration_new\backend

# 激活 conda 环境
conda activate report_migration_new

# 启动 FastAPI 服务（端口 9000）
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

看到如下输出即表示后端启动成功：

```
INFO:     Uvicorn running on http://0.0.0.0:9000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

---

### 第三步：启动前端

再打开一个新的 PowerShell/CMD 窗口：

```powershell
cd D:\development\PyCharmWorkSpace\report_migration_new\frontend

npm run dev
```

看到如下输出即表示前端启动成功：

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:4000/
```

---

### 第四步：打开浏览器

访问 http://localhost:4000 即可使用系统。

---

## 环境配置文件

后端配置位于 `backend/.env`，关键参数如下：

```ini
# API Key
ANTHROPIC_API_KEY=sk-...

# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=report_migration_new

# 服务端口
HOST=0.0.0.0
PORT=9000

# 允许跨域的前端地址
CORS_ORIGINS=["http://localhost:4000"]
```

---

## 常见问题

### 后端启动失败：No module named 'fastapi'

```powershell
cd backend
conda activate report_migration_new
pip install -r requirements.txt
```

### 前端启动失败：Cannot find module

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```

### MongoDB 连接失败

```powershell
# 检查 MongoDB 是否在运行
tasklist | findstr mongod

# 未运行则手动启动
mongod --dbpath C:\data\db
```

### 上传失败

检查以下几点：
1. 文件格式为 `.xlsx`
2. 文件大小 < 10MB
3. 后端正常运行：访问 http://localhost:9000/api/docs 确认
4. MongoDB 正常运行
5. 查看后端终端窗口的错误日志
