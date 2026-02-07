/**
 * TRON区块链API服务 - 多节点负载均衡
 */

class TronAPIService {
    constructor() {
        // 多节点配置
        this.apiNodes = [
            {
                name: 'TRONGrid Mainnet',
                url: 'https://api.trongrid.io',
                priority: 1,
                enabled: true,
                latency: 0,
                lastTest: 0,
                health: 100
            },
            {
                name: 'TRONGrid Shasta',
                url: 'https://api.shasta.trongrid.io',
                priority: 2,
                enabled: true,
                latency: 0,
                lastTest: 0,
                health: 100
            },
            {
                name: 'Ankr Mainnet',
                url: 'https://rpc.ankr.com/http/tron',
                priority: 3,
                enabled: true,
                latency: 0,
                lastTest: 0,
                health: 100
            },
            {
                name: 'Tron Public 1',
                url: 'https://tron-mainnet.token.im',
                priority: 4,
                enabled: true,
                latency: 0,
                lastTest: 0,
                health: 100
            },
            {
                name: 'Tron Public 2',
                url: 'https://tron-mainnet.s.chainbase.com',
                priority: 5,
                enabled: true,
                latency: 0,
                lastTest: 0,
                health: 100
            }
        ];
        
        this.currentNodeIndex = 0;
        this.usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
        this.apiTimeout = 10000; // 10秒超时
        this.maxRetries = 3;
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.failedRequests = new Map();
        this.requestHistory = [];
        this.maxHistory = 1000;
        
        // 统计数据
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalLatency: 0,
            lastError: null,
            lastSuccess: null
        };
    }

    /**
     * 初始化API服务
     * @returns {Promise<Object>}
     */
    async init() {
        console.log('🌐 初始化TRON API服务...');
        
        try {
            // 测试所有节点
            const testResults = await this.testAllNodes();
            
            // 选择最佳节点
            const bestNode = this.selectBestNode();
            
            if (!bestNode) {
                throw new Error('没有可用的API节点');
            }
            
            console.log(`✅ API服务初始化完成，最佳节点: ${bestNode.name}`);
            
            return {
                success: true,
                nodeCount: testResults.filter(r => r.success).length,
                bestNode: bestNode.name,
                latency: bestNode.latency,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ API服务初始化失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 测试所有节点
     * @returns {Promise<Array>}
     */
    async testAllNodes() {
        const results = [];
        const testAddress = 'TBsg3Qi3ApfJgFYqHh9Sddfj9kK8UobHfU'; // 测试地址
        
        for (let i = 0; i < this.apiNodes.length; i++) {
            if (!this.apiNodes[i].enabled) continue;
            
            const startTime = Date.now();
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);
                
                const response = await fetch(`${this.apiNodes[i].url}/v1/accounts/${testAddress}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const latency = Date.now() - startTime;
                    this.apiNodes[i].latency = latency;
                    this.apiNodes[i].lastTest = Date.now();
                    this.apiNodes[i].health = 100;
                    
                    results.push({
                        index: i,
                        name: this.apiNodes[i].name,
                        url: this.apiNodes[i].url,
                        latency: latency,
                        status: '在线',
                        success: true
                    });
                    
                } else {
                    this.apiNodes[i].health = Math.max(0, this.apiNodes[i].health - 20);
                    results.push({
                        index: i,
                        name: this.apiNodes[i].name,
                        url: this.apiNodes[i].url,
                        latency: 0,
                        status: `HTTP ${response.status}`,
                        success: false
                    });
                }
                
            } catch (error) {
                this.apiNodes[i].health = Math.max(0, this.apiNodes[i].health - 20);
                this.apiNodes[i].latency = 9999;
                
                results.push({
                    index: i,
                    name: this.apiNodes[i].name,
                    url: this.apiNodes[i].url,
                    latency: 0,
                    status: error.name === 'AbortError' ? '超时' : '连接失败',
                    success: false
                });
            }
            
            // 避免同时发起太多请求
            await this.delay(100);
        }
        
        return results;
    }

    /**
     * 选择最佳节点
     * @returns {Object|null}
     */
    selectBestNode() {
        const healthyNodes = this.apiNodes.filter(node => 
            node.enabled && node.health > 50
        );
        
        if (healthyNodes.length === 0) {
            return null;
        }
        
        // 按延迟和健康度排序
        healthyNodes.sort((a, b) => {
            const scoreA = (100 - a.latency / 100) * (a.health / 100);
            const scoreB = (100 - b.latency / 100) * (b.health / 100);
            return scoreB - scoreA;
        });
        
        const bestNode = healthyNodes[0];
        this.currentNodeIndex = this.apiNodes.findIndex(node => node.url === bestNode.url);
        
        return bestNode;
    }

    /**
     * 切换到下一个可用节点
     * @returns {boolean}
     */
    switchToNextNode() {
        const startIndex = this.currentNodeIndex;
        let attempts = 0;
        
        while (attempts < this.apiNodes.length) {
            this.currentNodeIndex = (this.currentNodeIndex + 1) % this.apiNodes.length;
            attempts++;
            
            const node = this.apiNodes[this.currentNodeIndex];
            if (node.enabled && node.health > 50) {
                console.log(`🔄 切换到节点: ${node.name}`);
                return true;
            }
            
            if (this.currentNodeIndex === startIndex) {
                break;
            }
        }
        
        return false;
    }

    /**
     * 查询TRX余额
     * @param {string} address - TRON地址
     * @param {number} retryCount - 当前重试次数
     * @returns {Promise<Object>}
     */
    async getTRXBalance(address, retryCount = 0) {
        this.stats.totalRequests++;
        
        try {
            const currentNode = this.apiNodes[this.currentNodeIndex];
            const startTime = Date.now();
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);
            
            const response = await fetch(`${currentNode.url}/v1/accounts/${address}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                const latency = Date.now() - startTime;
                
                // 更新节点状态
                currentNode.latency = latency;
                currentNode.lastTest = Date.now();
                currentNode.health = Math.min(100, currentNode.health + 5);
                
                // 更新统计
                this.stats.successfulRequests++;
                this.stats.totalLatency += latency;
                this.stats.lastSuccess = new Date().toISOString();
                
                // 添加到历史记录
                this.addToHistory({
                    type: 'TRX_BALANCE',
                    address: address,
                    node: currentNode.name,
                    latency: latency,
                    success: true,
                    timestamp: new Date().toISOString()
                });
                
                if (data.data && data.data.length > 0) {
                    const balanceSun = data.data[0].balance || 0;
                    const balanceTRX = balanceSun / 1000000;
                    
                    return {
                        success: true,
                        balance: balanceTRX,
                        latency: latency,
                        node: currentNode.name,
                        rawData: data.data[0],
                        timestamp: new Date().toISOString()
                    };
                } else {
                    return {
                        success: true,
                        balance: 0,
                        latency: latency,
                        node: currentNode.name,
                        message: '地址无数据'
                    };
                }
                
            } else {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
        } catch (error) {
            console.error(`查询TRX余额失败 (${address}):`, error);
            
            // 更新统计
            this.stats.failedRequests++;
            this.stats.lastError = error.message;
            
            // 添加到历史记录
            this.addToHistory({
                type: 'TRX_BALANCE',
                address: address,
                node: this.apiNodes[this.currentNodeIndex].name,
                error: error.message,
                success: false,
                timestamp: new Date().toISOString()
            });
            
            // 降低当前节点健康度
            const currentNode = this.apiNodes[this.currentNodeIndex];
            currentNode.health = Math.max(0, currentNode.health - 20);
            
            // 重试逻辑
            if (retryCount < this.maxRetries) {
                if (this.switchToNextNode()) {
                    return this.getTRXBalance(address, retryCount + 1);
                }
            }
            
            // 添加到重试队列
            this.addToQueue(address, 'trx');
            
            return {
                success: false,
                error: error.message,
                balance: 0,
                needRetry: true,
                retryCount: retryCount
            };
        }
    }

    /**
     * 查询USDT余额
     * @param {string} address - TRON地址
     * @param {number} retryCount - 当前重试次数
     * @returns {Promise<Object>}
     */
    async getUSDTBalance(address, retryCount = 0) {
        try {
            const currentNode = this.apiNodes[this.currentNodeIndex];
            const startTime = Date.now();
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);
            
            // 调用智能合约查询USDT余额
            const payload = {
                owner_address: address,
                contract_address: this.usdtContract,
                function_selector: "balanceOf(address)",
                parameter: this.addressToHex(address),
                visible: true
            };
            
            const response = await fetch(`${currentNode.url}/wallet/triggerconstantcontract`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                const latency = Date.now() - startTime;
                
                currentNode.latency = latency;
                currentNode.lastTest = Date.now();
                currentNode.health = Math.min(100, currentNode.health + 5);
                
                this.stats.successfulRequests++;
                this.stats.totalLatency += latency;
                this.stats.lastSuccess = new Date().toISOString();
                
                this.addToHistory({
                    type: 'USDT_BALANCE',
                    address: address,
                    node: currentNode.name,
                    latency: latency,
                    success: true,
                    timestamp: new Date().toISOString()
                });
                
                if (data.constant_result && data.constant_result.length > 0) {
                    const balanceHex = data.constant_result[0];
                    const balance = parseInt(balanceHex, 16) / 1000000;
                    
                    return {
                        success: true,
                        balance: balance,
                        latency: latency,
                        node: currentNode.name,
                        rawData: data
                    };
                } else {
                    return {
                        success: true,
                        balance: 0,
                        latency: latency,
                        node: currentNode.name
                    };
                }
                
            } else {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
        } catch (error) {
            console.error(`查询USDT余额失败 (${address}):`, error);
            
            this.stats.failedRequests++;
            this.stats.lastError = error.message;
            
            this.addToHistory({
                type: 'USDT_BALANCE',
                address: address,
                node: this.apiNodes[this.currentNodeIndex].name,
                error: error.message,
                success: false,
                timestamp: new Date().toISOString()
            });
            
            const currentNode = this.apiNodes[this.currentNodeIndex];
            currentNode.health = Math.max(0, currentNode.health - 20);
            
            if (retryCount < this.maxRetries) {
                if (this.switchToNextNode()) {
                    return this.getUSDTBalance(address, retryCount + 1);
                }
            }
            
            this.addToQueue(address, 'usdt');
            
            return {
                success: false,
                error: error.message,
                balance: 0,
                needRetry: true,
                retryCount: retryCount
            };
        }
    }

    /**
     * 批量查询余额
     * @param {Array} addresses - 地址数组
     * @returns {Promise<Array>}
     */
    async batchQueryBalances(addresses) {
        const results = [];
        
        for (const address of addresses) {
            try {
                const [trxResult, usdtResult] = await Promise.all([
                    this.getTRXBalance(address),
                    this.getUSDTBalance(address)
                ]);
                
                results.push({
                    address: address,
                    trx: trxResult.success ? trxResult.balance : 0,
                    usdt: usdtResult.success ? usdtResult.balance : 0,
                    trxSuccess: trxResult.success,
                    usdtSuccess: usdtResult.success,
                    trxNode: trxResult.node,
                    usdtNode: usdtResult.node,
                    timestamp: new Date().toISOString()
                });
                
                await this.delay(200); // 避免请求过于频繁
                
            } catch (error) {
                console.error(`批量查询失败 (${address}):`, error);
                results.push({
                    address: address,
                    trx: 0,
                    usdt: 0,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        return results;
    }

    /**
     * 添加到重试队列
     * @param {string} address - 地址
     * @param {string} type - 类型
     */
    addToQueue(address, type) {
        const existing = this.requestQueue.find(item => 
            item.address === address && item.type === type
        );
        
        if (!existing) {
            const queueItem = {
                address: address,
                type: type,
                retryCount: 0,
                addedTime: Date.now(),
                lastRetry: 0
            };
            
            this.requestQueue.push(queueItem);
            console.log(`📋 已添加 ${address} 到重试队列 (${type})`);
        }
    }

    /**
     * 处理重试队列
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        console.log(`🔄 处理重试队列 (${this.requestQueue.length} 个项目)`);
        
        // 取出前5个项目
        const itemsToProcess = this.requestQueue.splice(0, 5);
        
        for (const item of itemsToProcess) {
            try {
                item.retryCount++;
                item.lastRetry = Date.now();
                
                console.log(`🔄 重试: ${item.address} (${item.type}), 尝试 ${item.retryCount}`);
                
                let result;
                if (item.type === 'trx') {
                    result = await this.getTRXBalance(item.address);
                } else {
                    result = await this.getUSDTBalance(item.address);
                }
                
                if (result.success) {
                    console.log(`✅ 重试成功: ${item.address} (${item.type})`);
                    
                    // 触发成功回调
                    if (window.tronScanner && window.tronScanner.onQueueSuccess) {
                        window.tronScanner.onQueueSuccess(item.address, result);
                    }
                    
                } else if (result.needRetry && item.retryCount < 5) {
                    // 重新加入队列
                    this.requestQueue.push(item);
                }
                
                await this.delay(500);
                
            } catch (error) {
                console.error(`❌ 重试失败: ${item.address}`, error);
                
                if (item.retryCount < 5) {
                    this.requestQueue.push(item);
                }
            }
        }
        
        this.isProcessingQueue = false;
        
        // 如果队列还有项目，继续处理
        if (this.requestQueue.length > 0) {
            setTimeout(() => this.processQueue(), 1000);
        }
    }

    /**
     * 重新连接所有节点
     * @returns {Promise<Object>}
     */
    async reconnectAll() {
        console.log('🔄 重新连接所有API节点...');
        
        // 重置所有节点状态
        this.apiNodes.forEach(node => {
            node.latency = 0;
            node.lastTest = 0;
            node.health = 100;
        });
        
        // 重新测试所有节点
        const results = await this.testAllNodes();
        
        const workingNodes = results.filter(r => r.success);
        const bestNode = this.selectBestNode();
        
        return {
            success: workingNodes.length > 0,
            workingNodes: workingNodes.length,
            totalNodes: results.length,
            bestNode: bestNode ? bestNode.name : '无',
            results: results,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 地址转十六进制
     * @param {string} address - TRON地址
     * @returns {string} 十六进制
     */
    addressToHex(address) {
        const base58 = address.substring(1);
        let num = 0n;
        
        for (let i = 0; i < base58.length; i++) {
            const char = base58.charAt(i);
            const index = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.indexOf(char);
            num = num * 58n + BigInt(index);
        }
        
        let hex = num.toString(16);
        while (hex.length < 64) {
            hex = '0' + hex;
        }
        
        return hex;
    }

    /**
     * 添加到历史记录
     * @param {Object} record - 记录
     */
    addToHistory(record) {
        this.requestHistory.unshift(record);
        
        // 限制历史记录数量
        if (this.requestHistory.length > this.maxHistory) {
            this.requestHistory = this.requestHistory.slice(0, this.maxHistory);
        }
    }

    /**
     * 获取服务状态
     * @returns {Object}
     */
    getServiceStatus() {
        const workingNodes = this.apiNodes.filter(node => node.enabled && node.health > 50);
        const avgLatency = this.stats.successfulRequests > 0 
            ? Math.round(this.stats.totalLatency / this.stats.successfulRequests)
            : 0;
        
        const successRate = this.stats.totalRequests > 0
            ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100)
            : 0;
        
        return {
            currentNode: this.apiNodes[this.currentNodeIndex].name,
            workingNodes: workingNodes.length,
            totalNodes: this.apiNodes.length,
            queueSize: this.requestQueue.length,
            stats: {
                totalRequests: this.stats.totalRequests,
                successfulRequests: this.stats.successfulRequests,
                failedRequests: this.stats.failedRequests,
                successRate: `${successRate}%`,
                averageLatency: `${avgLatency}ms`,
                lastSuccess: this.stats.lastSuccess,
                lastError: this.stats.lastError
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 获取队列信息
     * @returns {Object}
     */
    getQueueInfo() {
        return {
            count: this.requestQueue.length,
            items: this.requestQueue.slice(0, 20).map(item => ({
                address: item.address,
                type: item.type,
                retryCount: item.retryCount,
                addedTime: new Date(item.addedTime).toLocaleTimeString(),
                lastRetry: item.lastRetry ? new Date(item.lastRetry).toLocaleTimeString() : '未重试'
            }))
        };
    }

    /**
     * 获取历史记录
     * @param {number} limit - 限制数量
     * @returns {Array}
     */
    getHistory(limit = 50) {
        return this.requestHistory.slice(0, limit);
    }

    /**
     * 延迟函数
     * @param {number} ms - 毫秒数
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出API服务
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TronAPIService;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return TronAPIService; });
} else {
    window.TronAPIService = TronAPIService;
}