# 阿里云 Docker 部署文档 (ALIYUN_DEPLOYMENT.md)

本文档提供将 `report_migration_new` 部署到阿里云服务器（基于 Docker）的详细指南。本方案不修改您现有的业务代码，只需将以下配置文件放置在项目对应的目录下即可实现高效的镜像打包和依赖复用。

## 0. 基础环境安装与拉取代码
在进行部署之前，您需要先确保服务器已经安装了运行环境，并把项目代码完整拉取。

### A. 安装 Docker 与 Docker-Compose (对于 Ubuntu/Debian)
如果您在执行 `docker-compose` 时提示 command not found，请执行以下命令一键安装：
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
```
*(注：如果是 CentOS 服务器，请使用 `sudo yum install -y docker` 并通过下载二进制包的方式安装 docker-compose)*

### B. 获取项目代码
推荐在您的电脑上先把代码推送到您的私有 Github/Gitlab 仓库，然后在阿里云服务器端执行拉取：
```bash
# 进入您想要存放项目的路径 (例如 /usr/local/src)
cd /usr/local/src

# 从 Git 仓库克隆代码 (请将下面的 URL 替换为您的仓库地址)
git clone https://github.com/您的用户名/report_migration_new.git

# 进入拉取好的项目目录 (后续所有的 Docker 命令都在此目录下执行)
cd report_migration_new
```

## 1. 原生环境依赖及版本校验
根据您本地实际使用环境 `report_migration_new` 提取，以下为构建参考的基准环境配置（Docker打包也将基于类似的环境）：
- **Python**: 依赖于本地 Conda 环境打包生成的完整列表（核心框架包括 FastAPI, Uvicorn, LangChain, Motor, ChromaDB 等），Docker 容器直接使用官方 Python 3.10-slim 镜像。
- **Node.js**: v22.22.0 (前端构建依赖引擎)
- **NPM**: 10.9.4
- **MongoDB**: 4.4+ (通过 Docker 独立运行，无需外部前置依赖，复用默认端口 27017 和数据卷以保证持久化)。

## 2. 预部署准备（必读 & 优先执行）
在正式构建和拉起容器之前，请确保以下问题均已解决，否则会导致部署超时或由于外部限制访问失败：

**⚠️ A. 阿里云安全组与系统防火墙设置**
- 登录阿里云控制台，找到对应实例的“配置规则”。
- **必须要打开的端口**：
  - `80` 和 `443` (HTTP/HTTPS) - 这是唯一需要开放的公网入口，所有的用户访问和 API 请求都会经过内置的 Nginx 转发。
  - `8904` (后端接口：已被**彻底从外网隔离**，仅允许前端 Nginx 容器在内网隐形转发访问，切勿对外网开放)。
  - `18977` (数据库：已被**彻底从外网隔离**，仅允许后端在内网互连，切勿对外网开放)。

**⚠️ B. 国内镜像源加速（核心优化）**
在代码构建过程中，拉取 Docker 基础镜像以及下载前端模块、Python 依赖时，经常会遇到网络阻滞。请配置加速：

1. **Docker 镜像源加速 (解决 `docker pull` 失败)**
   在您的阿里云服务器终端运行以下命令，配置您的专属阿里云加速器及可用备用源：
   ```bash
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json <<-'EOF'
   {
     "registry-mirrors": [
       "https://avp7679j.mirror.aliyuncs.com",
       "https://docker.m.daocloud.io",
       "https://docker.nju.edu.cn",
       "https://mirror.baidubce.com"
     ]
   }
   EOF
   sudo systemctl daemon-reload
   sudo systemctl restart docker
   ```

2. **代码依赖加速 (已在项目的 `Dockerfile` 中默认配置)**
   - Python 使用：清华源 (`https://pypi.tuna.tsinghua.edu.cn/simple`) 
   - NPM 使用：淘宝源 (`https://registry.npmmirror.com`)

**⚠️ C. ChromaDB 等内存占用风险预警**
- 初始化模型和文档向量化可能占用大量主机内存。您的阿里云服务器建议拥有至少 `2GB` RAM（推荐 `4GB+` 及以上）。
- 若部署中断查明为 `OOM (Out Of Memory)`，请增加云端 swap 配置或升级服务器内存。

---

## 3. 核心部署配置文件

本项目中已自动生成了相应的 Docker 部署相关配置文件。**该结构结合了 Docker 的分层缓存最佳实践，只要您的 `requirements.txt` 和 `package.json` 没有修改，无论怎么重启或更新业务代码，都不会重新下载构建依赖包**。

- `docker-compose.yml` (位于项目根目录)：统一管理 MongoDB、后端 API 和前端 Nginx 容器。
- `backend/Dockerfile` (位于后端目录)：采用分层缓存机制，优先提取并下载 `requirements.txt`。
- `frontend/Dockerfile` (位于前端目录)：采用多阶段构建，将 Vite 构建结果交由轻量级 Nginx 托管。

---

## 4. 日常执行方案（如何部署与更新）

您在阿里云服务器上获取到项目后，按照以下命令执行部署及运维（该方案完美满足了您的"简单、快速、不重下依赖"的需求）：

### 初次启动项目（拉取并构建镜像）
这步将会自动拉取 Python 和 Node 环境并应用上述的国内源进行**依赖下载**。在环境初试安装时，视网络情况可能需要几分钟。
```bash
docker compose up -d --build
```

### 停机与启动（不重建、不下载依赖）
一旦经过初次部署构建，后期日常无论怎样停机重启，依赖**全部复用当前环境，绝不重新加载**：
```bash
# 停机操作
docker-compose down

# 启动操作 (瞬间拉起)
docker-compose up -d
```

### 代码更新后的热更操作
考虑到您的业务场景，如果您只更改了纯粹的业务应用代码：
1. **对于后端（由于我们已采用卷挂载 `./backend/app:/app/app`）**：部分场景可以直接重启后端单容器：
   ```bash
   docker-compose restart backend
   ```
2. **对于前端视图代码**：
   假如修改了 `index.tsx` 或组件代码而没有修改 `package.json` 的节点版本依赖，可以在服务端执行构建，并且因为依赖层未变化，`npm install` 步骤将秒开并直接跳转至构建：
   ```bash
   docker-compose up -d --build frontend
   ```

### 排查问题与状态校验
```bash
# 查看所有服务的启动状态
docker-compose ps

# 查看报错日志 (例如后端是否因为 MongoDB 找不到报错等)
docker-compose logs -f backend
```
