#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔨 开始构建 TRON Scanner Pro...');

// 创建dist目录
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 创建子目录
const subDirs = ['js', 'css', 'config'];
subDirs.forEach(dir => {
    const dirPath = path.join(distDir, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// 复制文件函数
function copyFile(source, destination) {
    return new Promise((resolve, reject) => {
        fs.copyFile(source, destination, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`✅ 已复制: ${path.basename(source)}`);
                resolve();
            }
        });
    });
}

// 合并JS文件
async function mergeJSFiles() {
    console.log('📦 合并JavaScript文件...');
    
    const jsFiles = [
        'js/bip39-words.js',
        'js/crypto-engine.js',
        'js/tron-api.js',
        'js/scanner.js',
        'js/ui-manager.js'
    ];
    
    let mergedContent = `/*! TRON Scanner Pro v5.0.0 - ${new Date().toISOString()} */\n\n`;
    
    for (const file of jsFiles) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            mergedContent += `\n/* ${file} */\n\n${content}\n`;
        }
    }
    
    const outputPath = path.join(distDir, 'js', 'app.js');
    fs.writeFileSync(outputPath, mergedContent);
    console.log(`✅ 已合并JS文件: ${outputPath}`);
    
    return outputPath;
}

// 压缩CSS
async function minifyCSS() {
    console.log('🎨 压缩CSS文件...');
    
    const cssFile = 'css/styles.css';
    if (fs.existsSync(cssFile)) {
        const content = fs.readFileSync(cssFile, 'utf8');
        
        // 简单的CSS压缩
        const minified = content
            .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
            .replace(/\s+/g, ' ') // 压缩空格
            .replace(/;\s*/g, ';') // 压缩分号后的空格
            .replace(/:\s*/g, ':') // 压缩冒号后的空格
            .replace(/\s*\{\s*/g, '{') // 压缩大括号
            .replace(/\s*\}\s*/g, '}') // 压缩大括号
            .replace(/\s*,\s*/g, ',') // 压缩逗号
            .trim();
        
        const outputPath = path.join(distDir, 'css', 'styles.min.css');
        fs.writeFileSync(outputPath, minified);
        console.log(`✅ 已压缩CSS: ${outputPath}`);
    }
}

// 创建主HTML文件
async function createHTML() {
    console.log('📄 生成主HTML文件...');
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TRON助记词扫描器 v5.0 - 专业版</title>
    <meta name="description" content="企业级TRON区块链地址扫描系统，支持多节点API、真实余额查询、智能排队重试">
    <meta name="keywords" content="TRON, 扫描器, 区块链, 助记词, 钱包, 地址生成">
    <meta name="author" content="TRON Scanner Team">
    
    <!-- 加密库 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-sha256.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-sha3.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-pbkdf2.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-hmac.min.js"></script>
    
    <!-- 样式 -->
    <link rel="stylesheet" href="css/styles.min.css">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.0/svg/color/tron.svg">
    
    <!-- 主题颜色 -->
    <meta name="theme-color" content="#ff0606">
    
    <!-- PWA支持 -->
    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
</head>
<body>
    <div id="app">
        <!-- 应用内容将由JavaScript动态生成 -->
    </div>
    
    <!-- 加载动画 -->
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载TRON扫描器...</div>
            <div class="loading-version">v5.0.0 Professional</div>
        </div>
    </div>
    
    <!-- 主应用脚本 -->
    <script src="js/app.js"></script>
    
    <!-- 启动应用 -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 TRON Scanner Pro 正在启动...');
            
            // 初始化应用
            if (window.TronScannerApp) {
                window.TronScannerApp.init();
            } else {
                console.error('应用脚本加载失败');
                document.getElementById('loadingText').textContent = '加载失败，请刷新页面';
            }
        });
        
        // 注册Service Worker（PWA）
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('sw.js').then(function(registration) {
                    console.log('ServiceWorker 注册成功: ', registration.scope);
                }, function(err) {
                    console.log('ServiceWorker 注册失败: ', err);
                });
            });
        }
    </script>
    
    <!-- 统计代码（可选） -->
    <!-- <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXXXXX');
    </script> -->
</body>
</html>`;
    
    const outputPath = path.join(distDir, 'index.html');
    fs.writeFileSync(outputPath, htmlTemplate);
    console.log(`✅ 已生成HTML: ${outputPath}`);
}

// 创建manifest.json（PWA）
async function createManifest() {
    console.log('📱 创建PWA配置文件...');
    
    const manifest = {
        "name": "TRON Scanner Pro",
        "short_name": "TRON Scan",
        "description": "企业级TRON区块链地址扫描系统",
        "version": "5.0.0",
        "manifest_version": 3,
        "start_url": "/",
        "display": "standalone",
        "theme_color": "#ff0606",
        "background_color": "#0a0e14",
        "orientation": "portrait",
        "icons": [
            {
                "src": "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.0/svg/color/tron.svg",
                "sizes": "192x192",
                "type": "image/svg+xml"
            },
            {
                "src": "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.0/svg/color/tron.svg",
                "sizes": "512x512",
                "type": "image/svg+xml"
            }
        ],
        "categories": ["finance", "productivity", "utilities"],
        "screenshots": [
            {
                "src": "https://via.placeholder.com/1280x720/0a0e14/ff0606?text=TRON+Scanner+Pro",
                "sizes": "1280x720",
                "type": "image/png"
            }
        ],
        "shortcuts": [
            {
                "name": "开始扫描",
                "short_name": "扫描",
                "description": "启动TRON地址扫描",
                "url": "/?action=scan",
                "icons": [{ "src": "icon-192.png", "sizes": "192x192" }]
            },
            {
                "name": "查看余额",
                "short_name": "余额",
                "description": "查看发现余额的地址",
                "url": "/?action=balance",
                "icons": [{ "src": "icon-192.png", "sizes": "192x192" }]
            }
        ]
    };
    
    const outputPath = path.join(distDir, 'manifest.json');
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ 已创建manifest: ${outputPath}`);
}

// 创建Service Worker
async function createServiceWorker() {
    console.log('⚙️ 创建Service Worker...');
    
    const swContent = `// TRON Scanner Pro - Service Worker
const CACHE_NAME = 'tron-scanner-v5.0.0';
const urlsToCache = [
    './',
    './index.html',
    './css/styles.min.css',
    './js/app.js',
    './config/nodes.json',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-sha256.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-sha3.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-pbkdf2.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js-hmac.min.js'
];

// 安装
self.addEventListener('install', event => {
    console.log('Service Worker 安装中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存文件中...');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// 激活
self.addEventListener('activate', event => {
    console.log('Service Worker 激活中...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 获取请求
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 缓存命中
                if (response) {
                    return response;
                }
                
                // 克隆请求
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(response => {
                    // 检查响应是否有效
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // 克隆响应
                    const responseToCache = response.clone();
                    
                    // 缓存新请求
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
    );
});

// 后台同步
self.addEventListener('sync', event => {
    if (event.tag === 'sync-queue') {
        console.log('后台同步: 处理队列');
        event.waitUntil(processQueue());
    }
});

async function processQueue() {
    // 这里可以实现后台同步逻辑
    console.log('处理后台队列...');
}

// 推送通知
self.addEventListener('push', event => {
    const title = 'TRON Scanner';
    const options = {
        body: event.data.text(),
        icon: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.0/svg/color/tron.svg',
        badge: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.0/svg/color/tron.svg',
        vibrate: [200, 100, 200],
        tag: 'tron-scanner-notification',
        renotify: true,
        actions: [
            { action: 'view', title: '查看详情' },
            { action: 'close', title: '关闭' }
        ]
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    console.log('通知点击:', event.notification.tag);
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(clients.openWindow('/'));
    }
});`;
    
    const outputPath = path.join(distDir, 'sw.js');
    fs.writeFileSync(outputPath, swContent);
    console.log(`✅ 已创建Service Worker: ${outputPath}`);
}

// 创建README
async function createReadme() {
    console.log('📖 创建README...');
    
    const readmeContent = `# TRON助记词扫描器专业版 v5.0.0

## 概述
企业级TRON区块链地址扫描系统，支持多节点API、真实余额查询、智能排队重试机制。

## 功能特性
- ✅ 完整的BIP39/BIP32/BIP44标准实现
- ✅ 多节点TRON API负载均衡
- ✅ 真实TRX/USDT余额查询
- ✅ 智能排队重试系统
- ✅ 响应式现代化界面
- ✅ PWA支持（可安装为桌面应用）
- ✅ 离线缓存功能
- ✅ 企业级加密算法

## 快速开始

### 1. 安装依赖
\`\`\`bash
npm install
\`\`\`

### 2. 开发模式
\`\`\`bash
npm start
\`\`\`

### 3. 构建生产版本
\`\`\`bash
npm run build
\`\`\`

### 4. 部署
\`\`\`bash
npm run deploy
\`\`\`

## 项目结构
\`\`\`
tron-scanner-pro/
├── index.html              # 主界面
├── css/
│   └── styles.css         # 样式文件
├── js/
│   ├── scanner.js         # 扫描器主逻辑
│   ├── crypto-engine.js   # 加密算法引擎
│   ├── bip39-words.js     # BIP39完整词库
│   ├── tron-api.js        # TRON API服务
│   └── ui-manager.js      # UI管理
├── config/
│   └── nodes.json         # API节点配置
├── package.json           # 项目配置
├── build.js              # 构建脚本
└── README.md             # 项目说明
\`\`\`

## 技术栈
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **加密**: CryptoJS (SHA256, SHA3, PBKDF2, HMAC)
- **API**: TRON Grid, Ankr, Chainbase 等
- **构建**: Node.js, npm scripts

## 配置说明

### API节点配置
编辑 \`config/nodes.json\` 文件可以：
1. 添加/删除API节点
2. 调整节点优先级
3. 启用/禁用特定节点

### 扫描设置
通过界面可以配置：
- 扫描速度控制
- 重试次数限制
- 队列处理策略
- 节点选择偏好

## 安全说明
1. 所有加密操作在浏览器端完成
2. 助记词和私钥不会发送到服务器
3. 使用HTTPS连接保护数据传输
4. 支持本地存储加密选项

## 浏览器支持
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证
MIT License

## 支持与贡献
- 问题报告: GitHub Issues
- 功能建议: GitHub Discussions
- 贡献代码: Pull Requests

## 免责声明
本工具仅供教育和研究目的使用。使用者需遵守当地法律法规，对使用本工具产生的一切后果自负。`;

    const outputPath = path.join(distDir, 'README.md');
    fs.writeFileSync(outputPath, readmeContent);
    console.log(`✅ 已创建README: ${outputPath}`);
}

// 主构建流程
async function main() {
    try {
        console.log('🚀 TRON Scanner Pro 构建开始...\n');
        
        // 执行构建步骤
        await mergeJSFiles();
        await minifyCSS();
        await copyFile('config/nodes.json', path.join(distDir, 'config', 'nodes.json'));
        await createHTML();
        await createManifest();
        await createServiceWorker();
        await createReadme();
        
        console.log('\n🎉 构建完成！');
        console.log(`📁 输出目录: ${distDir}`);
        console.log('\n🔧 可用命令:');
        console.log('  npm start      - 启动开发服务器');
        console.log('  npm run build  - 构建生产版本');
        console.log('  npm run deploy - 构建并压缩');
        
    } catch (error) {
        console.error('\n❌ 构建失败:', error);
        process.exit(1);
    }
}

// 运行构建
main();