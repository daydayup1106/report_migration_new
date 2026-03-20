# 采用 slim 减小镜像体积
FROM python:3.10-slim

WORKDIR /app

# 更新依赖库并安装 gcc (直接使用系统源，因为容器构建时网络通常较宽带)
RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# 第一阶段（缓存利用层）：优先复制依赖描述文件
COPY requirements.txt .

# 使用清华源加速依赖安装
# 这种机制保证了只有 requirements.txt 变化时，Docker 才会重新拉取和安装依赖
RUN pip install --no-cache-dir --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple/ && \
    pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 第二阶段：放置源代码（业务代码的任何变更不会影响到以上的环境缓存）
COPY . .

# 暴露接口服务
EXPOSE 8904

# 启动服务
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8904"]
