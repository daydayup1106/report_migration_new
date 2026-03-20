# --------- 阶段一：构建前端产物 (依赖复用缓存机制) ---------
FROM node:22.22.0-alpine AS builder

WORKDIR /app

# 设置 npm 淘宝国内镜像来加速并避免丢包
RUN npm config set registry https://registry.npmmirror.com

# 和后端同理，仅先复制 package.json 文件以便 Docker 构建环境缓存依赖
COPY package*.json ./

# 安装依赖。由于上方步骤先复制了 package.json，这里将产生安装层缓存。
# 若 package.json 不动，此步骤将秒级跳过，不重新下载 node_modules。
RUN npm install

# 复制源码并执行前端打包
COPY . .
RUN npm run build

# --------- 阶段二：使用 Nginx 提供生产环境高性能轻量托管 ---------
FROM nginx:alpine

# 将构建得到的静态文件分发到 Nginx 目录下
COPY --from=builder /app/dist /usr/share/nginx/html

# 提供默认配置文件（如果您的项目有定制 react-router 路由，可以用该行做基础伪静态 fallback）
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:8904/; \
        proxy_set_header Host $$host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
