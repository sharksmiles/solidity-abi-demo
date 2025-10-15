'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSignMessage, useSwitchChain, useChainId } from 'wagmi';
import { useState } from 'react';
import { Wallet, MessageSquare, Network, FileText, Settings, Play, DollarSign } from 'lucide-react';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import ContractInterface from '../components/ContractInterface';
import ExampleContracts from '../components/ExampleContracts';

const supportedChains = [mainnet, polygon, optimism, arbitrum, base, sepolia];

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  const { signMessage, data: signature, isPending: isSigningPending } = useSignMessage();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  
  const [activeTab, setActiveTab] = useState('wallet');
  const [messageToSign, setMessageToSign] = useState('');
  const [contractAbi, setContractAbi] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [showExamples, setShowExamples] = useState(true);

  const generateRandomMessage = () => {
    const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setMessageToSign(`Hello Web3! Random: ${randomString}`);
  };

  const handleSignMessage = async () => {
    if (!messageToSign) return;
    try {
      await signMessage({ message: messageToSign });
    } catch (error) {
      console.error('签名失败:', error);
    }
  };

  const handleChainSwitch = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId });
    } catch (error) {
      console.error('切换链失败:', error);
    }
  };

  const currentChain = supportedChains.find(chain => chain.id === chainId);

  const handleSelectContract = (address: string, abi: string) => {
    setContractAddress(address);
    setContractAbi(abi);
    setShowExamples(false);
  };

  const tabs = [
    { id: 'wallet', label: '钱包管理', icon: Wallet },
    { id: 'contract', label: '合约交互', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 标签导航 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8">
            <div className="flex border-b border-gray-200/50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-6 py-5 text-center font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : 'bg-gray-50/50 text-gray-700 hover:bg-gray-100/70 hover:shadow-md'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-2" />
                    <span className="text-sm font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 钱包管理标签 */}
          {activeTab === 'wallet' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">钱包管理</h2>
                <ConnectButton />
              </div>
              
              {isConnected && (
                <div className="space-y-8">
                  {/* 钱包信息区域 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Wallet className="w-5 h-5 mr-2 text-blue-600" />
                        钱包地址
                      </h3>
                      <p className="text-sm text-gray-600 break-all font-mono bg-white/50 p-3 rounded-lg">
                        {address}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Network className="w-5 h-5 mr-2 text-green-600" />
                        当前网络
                      </h3>
                      <p className="text-lg font-semibold text-gray-800 bg-white/50 p-3 rounded-lg">
                        {currentChain?.name || '未知网络'}
                      </p>
                    </div>
                    
                    {balance && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 md:col-span-2">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
                          余额
                        </h3>
                        <p className="text-lg font-semibold text-gray-800 bg-white/50 p-3 rounded-lg">
                          {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                        </p>
                      </div>
                    )}
                  </div>



                  {/* 消息签名区域 */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-orange-600" />
                      消息签名
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          要签名的消息
                        </label>
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={messageToSign}
                            onChange={(e) => setMessageToSign(e.target.value)}
                            placeholder="输入要签名的消息..."
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/70"
                          />
                          <button
                            onClick={generateRandomMessage}
                            className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            随机
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleSignMessage}
                        disabled={!messageToSign || isSigningPending}
                        className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                      >
                        {isSigningPending ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            签名中...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 mr-2" />
                            签名消息
                          </span>
                        )}
                      </button>

                      {signature && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            签名结果
                          </h4>
                          <div className="bg-white/70 p-3 rounded-lg">
                            <p className="font-mono text-xs text-green-700 break-all">
                              {signature}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}





          {/* 合约交互标签 */}
          {activeTab === 'contract' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1"></div>
                  <h2 className="text-2xl font-bold text-gray-800">智能合约交互</h2>
                  <div className="flex-1 flex justify-end">
                    {isConnected && (
                      <div className="flex items-center space-x-2">
                        <Network className="w-5 h-5 text-blue-600" />
                        <select
                          value={chainId}
                          onChange={(e) => handleChainSwitch(Number(e.target.value))}
                          className="pl-3 pr-8 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl border-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl cursor-pointer text-sm"
                        >
                          {supportedChains.map((chain) => (
                            <option key={chain.id} value={chain.id} className="bg-white text-gray-800">
                              {chain.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600">基于 ABI 动态生成合约交互界面</p>
                {!showExamples && (contractAddress || contractAbi) && (
                  <button
                    onClick={() => setShowExamples(true)}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center mx-auto"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    查看示例
                  </button>
                )}
              </div>
              
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">请先连接钱包</p>
                  <ConnectButton />
                </div>
              ) : (
                <div className="space-y-8">
                  {showExamples && (
                    <ExampleContracts onSelectContract={handleSelectContract} />
                  )}

                  {!showExamples && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <Settings className="w-4 h-4 mr-2 text-blue-600" />
                          合约地址
                        </label>
                        <input
                          type="text"
                          value={contractAddress}
                          onChange={(e) => setContractAddress(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/70 font-mono"
                        />
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-purple-600" />
                          合约 ABI JSON
                        </label>
                        <textarea
                          value={contractAbi}
                          onChange={(e) => setContractAbi(e.target.value)}
                          placeholder='[{"inputs":[],"name":"example","outputs":[],"stateMutability":"view","type":"function"}]'
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/70 font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {contractAddress && contractAbi && !showExamples && (
                    <ContractInterface 
                      contractAddress={contractAddress}
                      contractAbi={contractAbi}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
