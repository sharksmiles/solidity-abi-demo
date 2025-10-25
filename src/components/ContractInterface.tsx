'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { Play, Eye, Send, Loader2, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { parseEther } from 'viem';

interface ContractInterfaceProps {
  contractAddress: string;
  contractAbi: string;
}

interface AbiFunction {
  name: string;
  type: string;
  stateMutability: string;
  inputs: Array<{
    name: string;
    type: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
}

interface FunctionInputs {
  [functionName: string]: {
    [inputName: string]: string;
  };
}

// 新增：ETH支付金额的类型定义
interface PaymentAmounts {
  [functionName: string]: string;
}

// 定义合约函数返回值的类型
type ContractFunctionResult = string | number | boolean | bigint | unknown[] | Record<string, unknown>;

// 定义读取配置的类型
interface ReadConfig {
  enabled: boolean;
  functionName: string;
  args: unknown[];
  abi: unknown[];
}

export default function ContractInterface({ contractAddress, contractAbi }: ContractInterfaceProps) {
  const [functionInputs, setFunctionInputs] = useState<FunctionInputs>({});
  // 新增：支付金额状态
  const [paymentAmounts, setPaymentAmounts] = useState<PaymentAmounts>({});

  const [results, setResults] = useState<{ [key: string]: ContractFunctionResult }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedNetwork, setSelectedNetwork] = useState<number>(1); // 默认主网
  const [currentExecutingFunction, setCurrentExecutingFunction] = useState<string>('');
  const [currentReadingFunction, setCurrentReadingFunction] = useState<string>('');
  const [readConfig, setReadConfig] = useState<ReadConfig | null>(null);
  const [contractValidation, setContractValidation] = useState<{
    isValid: boolean | null;
    message: string;
    isChecking: boolean;
  }>({ isValid: null, message: '', isChecking: false });

  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();
  
  // 使用 useReadContract hook
  const { 
    data: readData, 
    isError: isReadError, 
    error: readError
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: readConfig?.abi || [],
    functionName: readConfig?.functionName || '',
    args: readConfig?.args || [],
    query: {
      enabled: readConfig?.enabled || false,
    }
  });
  
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTransactionError, error: transactionError, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // 处理writeContract错误状态（包括用户取消）
  useEffect(() => {
    if (isWriteError && writeError && currentExecutingFunction) {
      const errorMessage = writeError.message || '未知错误';
      let displayMessage = '';
      
      // 检查是否是用户取消交易
      if (errorMessage.includes('User rejected') || 
          errorMessage.includes('user rejected') || 
          errorMessage.includes('User denied') ||
          errorMessage.includes('user denied') ||
          errorMessage.includes('cancelled') ||
          errorMessage.includes('canceled')) {
        displayMessage = '❌ 用户取消了交易';
      } else if (errorMessage.includes('insufficient funds')) {
        displayMessage = '❌ 余额不足，无法支付gas费用或ETH';
      } else if (errorMessage.includes('Insufficient payment') || 
                 errorMessage.includes('insufficient payment')) {
        displayMessage = '❌ 支付金额不足，请检查合约要求的最小支付金额';
      } else if (errorMessage.includes('execution reverted')) {
        if (errorMessage.includes('Insufficient payment')) {
          displayMessage = '❌ 交易失败: 支付金额不足。请增加ETH支付金额或检查合约要求';
        } else {
          displayMessage = `❌ 合约执行失败: ${errorMessage}`;
        }
      } else if (errorMessage.includes('gas')) {
        displayMessage = `❌ Gas相关错误: ${errorMessage}`;
      } else if (errorMessage.includes('value')) {
        displayMessage = `❌ 支付金额错误: ${errorMessage}`;
      } else {
        displayMessage = `❌ 交易失败: ${errorMessage}`;
      }
      
      setErrors(prev => ({
        ...prev,
        [currentExecutingFunction]: displayMessage
      }));
      setResults(prev => ({ ...prev, [currentExecutingFunction]: '' })); // 清除结果
      setCurrentExecutingFunction(''); // 清除当前执行的函数
    }
  }, [isWriteError, writeError, currentExecutingFunction]);

  // 处理 useReadContract 的结果
  useEffect(() => {
    if (readConfig?.enabled && currentReadingFunction) {
      if (readData !== undefined) {
        // 格式化显示结果
        let displayResult: ContractFunctionResult;
        
        // 根据数据类型进行格式化
        if (typeof readData === 'boolean') {
          displayResult = readData ? 'true' : 'false';
        } else if (typeof readData === 'bigint') {
          displayResult = readData.toString();
        } else if (typeof readData === 'number') {
          displayResult = readData.toString();
        } else if (typeof readData === 'string') {
          displayResult = readData;
        } else if (Array.isArray(readData)) {
          displayResult = JSON.stringify(readData, null, 2);
        } else if (typeof readData === 'object' && readData !== null) {
          displayResult = JSON.stringify(readData, null, 2);
        } else {
          // 处理其他情况，包括 null
          displayResult = readData === null ? 'null' : String(readData);
        }
        
        setResults(prev => ({
          ...prev,
          [currentReadingFunction]: displayResult
        }));
        setCurrentReadingFunction('');
        setReadConfig(null);
      } else if (isReadError && readError) {
        const errorMessage = readError.message || '未知错误';
        let displayMessage = '';
        
        // 检查是否是用户取消操作
        if (errorMessage.includes('User rejected') || 
            errorMessage.includes('user rejected') || 
            errorMessage.includes('User denied') ||
            errorMessage.includes('user denied') ||
            errorMessage.includes('cancelled') ||
            errorMessage.includes('canceled')) {
          displayMessage = '❌ 用户取消了查询';
        } else if (errorMessage.includes('execution reverted')) {
          displayMessage = `❌ 合约执行被回滚: ${errorMessage}`;
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          displayMessage = `❌ 网络连接错误: ${errorMessage}`;
        } else if (errorMessage.includes('invalid address')) {
          displayMessage = `❌ 无效的合约地址: ${errorMessage}`;
        } else if (errorMessage.includes('转换')) {
          displayMessage = `❌ 参数错误: ${errorMessage}`;
        } else if (errorMessage.includes('returned no data') || errorMessage.includes('"0x"')) {
          // 专门处理返回空数据的情况
          displayMessage = `❌ 函数调用失败: 可能原因包括：
          1. 合约地址无效或不存在
          2. 函数 "${currentReadingFunction}" 在合约中不存在
          3. 当前网络不正确
          4. 合约未正确部署
          
          详细错误: ${errorMessage}`;
        } else {
          displayMessage = `❌ 查询失败: ${errorMessage}`;
        }
        
        setErrors(prev => ({
          ...prev,
          [currentReadingFunction]: displayMessage
        }));
        setResults(prev => ({ ...prev, [currentReadingFunction]: '' }));
        setCurrentReadingFunction('');
        setReadConfig(null);
      }
    }
  }, [readData, isReadError, readError, readConfig?.enabled, currentReadingFunction]);

  // 处理交易状态变化
  useEffect(() => {
    if (hash && currentExecutingFunction) {
      if (isConfirming) {
        // 交易已提交，正在确认中
        setResults(prev => ({
          ...prev,
          [currentExecutingFunction]: `交易确认中... (Hash: ${hash.slice(0, 10)}...)`
        }));
      } else if (isConfirmed && receipt) {
        // 交易确认成功
        const receiptInfo = {
          hash: hash,
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 'success' ? '成功' : '失败'
        };
        setResults(prev => ({
          ...prev,
          [currentExecutingFunction]: `✅ 交易成功!\n哈希: ${hash}\n区块: ${receiptInfo.blockNumber}\nGas使用: ${receiptInfo.gasUsed}`
        }));
        setCurrentExecutingFunction(''); // 清除当前执行的函数
      } else if (isTransactionError) {
        // 交易失败
        setErrors(prev => ({
          ...prev,
          [currentExecutingFunction]: `❌ 交易失败: ${transactionError?.message || '未知错误'}`
        }));
        setResults(prev => ({ ...prev, [currentExecutingFunction]: '' })); // 清除结果
        setCurrentExecutingFunction(''); // 清除当前执行的函数
      }
    }
  }, [hash, isConfirming, isConfirmed, isTransactionError, transactionError, currentExecutingFunction, receipt]);

  // 支持的网络配置
  const networks = useMemo(() => {
    return [
      // 以太坊网络
      { id: 1, name: '以太坊主网', rpcUrl: 'https://eth.llamarpc.com', chain: null },
      { id: 11155111, name: 'Sepolia 测试网', rpcUrl: 'https://ethereum-sepolia.publicnode.com', chain: null },
      
      // Layer 2 主网
      { id: 42161, name: 'Arbitrum One 主网', rpcUrl: 'https://arb1.arbitrum.io/rpc', chain: null },
      { id: 10, name: 'Optimism 主网', rpcUrl: 'https://mainnet.optimism.io', chain: null },
      { id: 8453, name: 'Base 主网', rpcUrl: 'https://mainnet.base.org', chain: null },
      
      // Polygon 网络
      { id: 137, name: 'Polygon 主网', rpcUrl: 'https://polygon-rpc.com', chain: null },
      { id: 80001, name: 'Mumbai 测试网', rpcUrl: 'https://rpc-mumbai.maticvigil.com', chain: null },
      
      // BSC 网络
      { id: 56, name: 'BSC 主网', rpcUrl: 'https://bsc-dataseed.binance.org', chain: null },
      { id: 97, name: 'BSC 测试网', rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545', chain: null },
      
      // Cronos 网络
      { id: 25, name: 'Cronos 主网', rpcUrl: 'https://evm.cronos.org', chain: null },
      { id: 338, name: 'Cronos 测试网', rpcUrl: 'https://evm-t3.cronos.org', chain: null },
    ];
  }, []);

  // 获取当前选中的网络
  const currentNetwork = useMemo(() => {
    return networks.find(n => n.id === selectedNetwork) || networks[0];
  }, [networks, selectedNetwork]);

  // 检查合约有效性
  // 验证合约地址函数
  const validateContractAddress = useCallback(async (address: string) => {
    try {
      const { createPublicClient, http, isAddress } = await import('viem');
      
      // 检查地址格式
      if (!isAddress(address)) {
        throw new Error('无效的地址格式');
      }
      
      const client = createPublicClient({
        transport: http(currentNetwork.rpcUrl)
      });

      // 检查地址是否为合约
      const code = await client.getBytecode({ address: address as `0x${string}` });
      if (!code || code === '0x') {
        throw new Error(`该地址在 ${currentNetwork.name} 上不是合约地址，或合约未部署`);
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }, [currentNetwork.rpcUrl, currentNetwork.name]);

  // 解析 ABI
  const parsedAbi = useMemo(() => {
    try {
      const abi = JSON.parse(contractAbi) as unknown[];
      return abi.filter((item: unknown): item is AbiFunction => {
        return typeof item === 'object' && item !== null && 'type' in item && (item as { type: string }).type === 'function';
      });
    } catch (error) {
      console.error('ABI 解析失败:', error);
      return [];
    }
  }, [contractAbi]);

  const checkContractValidity = useCallback(async () => {
    if (!contractAddress || parsedAbi.length === 0) return;
    
    setContractValidation({ isValid: null, message: '', isChecking: true });
    
    try {
      await validateContractAddress(contractAddress);
      setContractValidation({
        isValid: true,
        message: `✅ 合约验证成功 (${currentNetwork.name})`,
        isChecking: false
      });
    } catch (error) {
      setContractValidation({
        isValid: false,
        message: error instanceof Error ? error.message : '验证失败',
        isChecking: false
      });
    }
  }, [contractAddress, parsedAbi.length, currentNetwork.name, validateContractAddress]);

  // 当网络或合约地址变化时重新验证
  useEffect(() => {
    checkContractValidity();
  }, [contractAddress, selectedNetwork, parsedAbi.length, checkContractValidity]);

  // 分离读取和写入函数
  const readFunctions = useMemo(() => 
    parsedAbi.filter(func => func.stateMutability === 'view' || func.stateMutability === 'pure'),
    [parsedAbi]
  );

  const writeFunctions = useMemo(() => 
    parsedAbi.filter(func => func.stateMutability === 'nonpayable' || func.stateMutability === 'payable'),
    [parsedAbi]
  );

  // 处理输入值变化
  const handleInputChange = (functionName: string, inputName: string, value: string) => {
    setFunctionInputs(prev => ({
      ...prev,
      [functionName]: {
        ...prev[functionName],
        [inputName]: value
      }
    }));
  };

  // 新增：处理支付金额变化
  const handlePaymentAmountChange = (functionName: string, value: string) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [functionName]: value
    }));
    
    // 清除之前的错误信息
    if (errors[functionName] && errors[functionName].includes('支付金额')) {
      setErrors(prev => ({
        ...prev,
        [functionName]: ''
      }));
    }
  };

  // 新增：验证支付金额
  const validatePaymentAmount = (amount: string): { isValid: boolean; error?: string } => {
    if (!amount || amount.trim() === '') {
      return { isValid: false, error: '请输入支付金额' };
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return { isValid: false, error: '支付金额必须是有效数字' };
    }
    
    if (numAmount < 0) {
      return { isValid: false, error: '支付金额不能为负数' };
    }
    
    if (numAmount === 0) {
      return { isValid: false, error: '支付金额必须大于0' };
    }
    
    // 检查是否超过合理范围（比如1000 ETH）
    if (numAmount > 1000) {
      return { isValid: false, error: '支付金额过大，请确认是否正确' };
    }
    
    // 检查小数位数是否过多（最多18位小数）
    const decimalParts = amount.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 18) {
      return { isValid: false, error: 'ETH最多支持18位小数' };
    }
    
    return { isValid: true };
  };

  // 转换输入参数
  const convertInputValue = (value: string, type: string) => {
    if (!value) return undefined;
    
    try {
      switch (type) {
        case 'uint256':
        case 'uint':
          return BigInt(value);
        case 'int256':
        case 'int':
          return BigInt(value);
        case 'bool':
          return value.toLowerCase() === 'true';
        case 'address':
          return value as `0x${string}`;
        case 'string':
          return value;
        case 'bytes':
        case 'bytes32':
          return value as `0x${string}`;
        default:
          if (type.startsWith('uint') || type.startsWith('int')) {
            return BigInt(value);
          }
          return value;
      }
    } catch {
      throw new Error(`无法转换值 "${value}" 为类型 "${type}"`);
    }
  };

  // 调用读取函数
  const callReadFunction = async (func: AbiFunction) => {
    try {
      // 清除之前的错误和结果
      setErrors(prev => ({ ...prev, [func.name]: '' }));
      setResults(prev => ({ ...prev, [func.name]: '查询中...' }));
      setCurrentReadingFunction(func.name);
      
      // 首先验证合约地址
      await validateContractAddress(contractAddress);
      
      // 准备函数参数
      const inputs = func.inputs.map(input => {
        const value = functionInputs[func.name]?.[input.name] || '';
        if (!value && input.type !== 'bool') return undefined;
        return convertInputValue(value, input.type);
      }).filter(val => val !== undefined);

      // 使用原始 ABI
      const originalAbi = JSON.parse(contractAbi);

      // 配置 useReadContract
      setReadConfig({
        enabled: true,
        functionName: func.name,
        args: inputs,
        abi: originalAbi
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      let displayMessage = '';
      
      if (errorMessage.includes('转换')) {
        displayMessage = `❌ 参数错误: ${errorMessage}`;
      } else if (errorMessage.includes('无效的地址格式')) {
        displayMessage = `❌ 合约地址格式无效: ${contractAddress}`;
      } else if (errorMessage.includes('不是合约地址')) {
        displayMessage = `❌ 该地址不是合约地址或合约未在当前网络部署: ${contractAddress}`;
      } else {
        displayMessage = `❌ 查询失败: ${errorMessage}`;
      }
      
      setErrors(prev => ({
        ...prev,
        [func.name]: displayMessage
      }));
      setResults(prev => ({ ...prev, [func.name]: '' }));
      setCurrentReadingFunction('');
    }
  };

  // 智能 gas 估算函数
  const estimateGasLimit = (functionName: string, inputCount: number): bigint => {
    const name = functionName.toLowerCase();
    
    // 基础 gas limit
    let gasLimit = BigInt(100000);
    
    // 根据函数类型调整 gas limit
    if (name.includes('approve') || name.includes('transfer')) {
      gasLimit = BigInt(100000); // ERC20/ERC721 标准函数
    } else if (name.includes('mint')) {
      gasLimit = BigInt(200000); // Mint 操作通常需要更多 gas
    } else if (name.includes('burn')) {
      gasLimit = BigInt(150000); // Burn 操作
    } else if (name.includes('swap') || name.includes('exchange')) {
      gasLimit = BigInt(300000); // DEX 相关操作
    } else if (name.includes('stake') || name.includes('unstake')) {
      gasLimit = BigInt(250000); // Staking 操作
    } else if (name.includes('claim') || name.includes('withdraw')) {
      gasLimit = BigInt(200000); // 提取操作
    } else if (name.includes('deposit')) {
      gasLimit = BigInt(180000); // 存款操作
    } else {
      // 根据输入参数数量调整
      gasLimit = BigInt(100000 + inputCount * 20000);
    }
    
    // 确保不超过网络限制（16,777,216）
    const maxGasLimit = BigInt(10000000); // 设置一个安全的上限
    return gasLimit > maxGasLimit ? maxGasLimit : gasLimit;
  };

  // 调用写入函数
  const callWriteFunction = async (func: AbiFunction) => {
    // 清除之前的错误和结果
    setErrors(prev => ({ ...prev, [func.name]: '' }));
    setResults(prev => ({ ...prev, [func.name]: '' }));
    setCurrentExecutingFunction(func.name); // 设置当前执行的函数
    
    const inputs = func.inputs.map(input => {
      const value = functionInputs[func.name]?.[input.name] || '';
      return convertInputValue(value, input.type);
    }).filter(val => val !== undefined);

    try {
      // 准备基础参数
      const gasLimit = estimateGasLimit(func.name, func.inputs.length);

      // 如果是 payable 函数，处理支付金额
      if (func.stateMutability === 'payable') {
        const paymentAmount = paymentAmounts[func.name] || '';
        
        // 验证支付金额
        const validation = validatePaymentAmount(paymentAmount);
        if (!validation.isValid) {
          setErrors(prev => ({
            ...prev,
            [func.name]: `❌ ${validation.error}`
          }));
          setCurrentExecutingFunction('');
          return;
        }

        try {
          const ethValue = parseEther(paymentAmount);
          await writeContract({
            address: contractAddress as `0x${string}`,
            abi: JSON.parse(contractAbi),
            functionName: func.name,
            args: inputs,
            gas: gasLimit,
            value: ethValue,
          });
        } catch (parseError) {
          setErrors(prev => ({
            ...prev,
            [func.name]: `❌ 支付金额格式错误: ${parseError}`
          }));
          setCurrentExecutingFunction('');
          return;
        }
      } else {
        // 非 payable 函数，不需要 value 参数
        await writeContract({
          address: contractAddress as `0x${string}`,
          abi: JSON.parse(contractAbi),
          functionName: func.name,
          args: inputs,
          gas: gasLimit,
        });
      }

      setResults(prev => ({
        ...prev,
        [func.name]: '交易已提交，等待确认...'
      }));
      
    } catch (error) {
      // 这里的错误处理主要用于参数转换等同步错误
      // writeContract的异步错误会在useEffect中处理
      if (error instanceof Error && error.message.includes('转换')) {
        setErrors(prev => ({
          ...prev,
          [func.name]: `❌ 参数错误: ${error.message}`
        }));
        setCurrentExecutingFunction(''); // 清除当前执行的函数
      }
      // 其他错误让useEffect处理
    }
  };

  // 渲染函数输入框
  const renderFunctionInputs = (func: AbiFunction) => {
    const inputElements = func.inputs.map((input) => (
      <div key={input.name} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {input.name} ({input.type})
        </label>
        <input
          type="text"
          value={functionInputs[func.name]?.[input.name] || ''}
          onChange={(e) => handleInputChange(func.name, input.name, e.target.value)}
          placeholder={`输入 ${input.type} 类型的值`}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
        />
      </div>
    ));

    // 如果是 payable 函数，添加 ETH 支付金额输入框
    if (func.stateMutability === 'payable') {
      inputElements.push(
        <div key="payment-amount" className="space-y-2">
          <label className="block text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            支付金额 (ETH) *
          </label>
          <input
            type="number"
            step="0.000000000000000001"
            min="0"
            value={paymentAmounts[func.name] || ''}
            onChange={(e) => handlePaymentAmountChange(func.name, e.target.value)}
            placeholder="输入要发送的 ETH 数量"
            className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm bg-orange-50 dark:bg-orange-900/20"
          />
          <p className="text-xs text-orange-600 dark:text-orange-400">
            此函数需要支付 ETH，请输入要发送的金额
          </p>
        </div>
      );
    }

    return inputElements;
  };

  // 渲染函数卡片
  const renderFunctionCard = (func: AbiFunction, isReadFunction: boolean, index: number) => {
    // 改进加载状态逻辑：区分读取和写入函数的加载状态
    const isWriteLoading = (isWritePending || isConfirming) && currentExecutingFunction === func.name;
    const isReadLoading = isReadFunction && currentReadingFunction === func.name;
    const isLoading = isReadFunction ? isReadLoading : isWriteLoading;
    
    const hasError = errors[func.name];
    const hasResult = results[func.name];
    
    // 创建唯一的 key，包含函数名、参数类型和索引
    const uniqueKey = `${func.name}-${func.inputs.map(input => input.type).join('-')}-${index}`;

    return (
      <div key={uniqueKey} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            {isReadFunction ? <Eye size={20} className="text-blue-500" /> : <Send size={20} className="text-green-500" />}
            <span>{func.name}</span>
          </h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isReadFunction 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {func.stateMutability}
          </span>
        </div>

        {func.inputs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">参数:</h4>
            {renderFunctionInputs(func)}
          </div>
        )}

        {/* 主要操作按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              if (isReadFunction) {
                callReadFunction(func);
              } else {
                callWriteFunction(func);
              }
            }}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isReadFunction
                ? 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300'
                : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300'
            } disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Play size={20} />
            )}
            <span>
              {isLoading ? (
                isReadFunction ? '查询中...' : (
                  isWritePending ? '提交中...' : 
                  isConfirming ? '确认中...' : '执行中...'
                )
              ) : (
                isReadFunction ? '查询' : '执行'
              )}
            </span>
          </button>
          
          {/* 读取函数的取消按钮 */}
          {isReadFunction && isReadLoading && (
            <button
              onClick={() => {
                // 禁用 useReadContract
                setReadConfig(prev => prev ? { ...prev, enabled: false } : null);
                setCurrentReadingFunction('');
                setResults(prev => ({ ...prev, [func.name]: '' }));
                setErrors(prev => ({ ...prev, [func.name]: '' }));
              }}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              取消
            </button>
          )}
        </div>

        {/* 显示结果 */}
        {hasResult && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-400">结果:</span>
            </div>
            <pre className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">
              {typeof hasResult === 'object' ? JSON.stringify(hasResult, null, 2) : hasResult}
            </pre>
          </div>
        )}

        {/* 显示错误 */}
        {hasError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <XCircle size={16} className="text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-400">错误:</span>
              </div>
              <button
                onClick={() => {
                  setErrors(prev => ({ ...prev, [func.name]: '' }));
                  setResults(prev => ({ ...prev, [func.name]: '' }));
                }}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                清除
              </button>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">{hasError}</p>
          </div>
        )}

        {/* 显示交易状态 */}
        {hash && (currentExecutingFunction === func.name || (hasResult && typeof hasResult === 'string' && hasResult.includes(hash))) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                交易哈希: <span className="font-mono break-all">{hash}</span>
              </p>
              {isConfirming && (
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>等待确认...</span>
                </p>
              )}
              {isConfirmed && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span>交易已确认!</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (parsedAbi.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          请输入有效的 ABI JSON 来生成合约交互界面
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          合约信息
        </h3>
        
        {/* 网络选择器 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            选择网络:
          </label>
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
          >
            {networks.map(network => (
              <option key={network.id} value={network.id}>
                {network.name}
              </option>
            ))}
          </select>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          网络: <span className="font-medium">{currentNetwork.name}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          地址: <span className="font-mono">{contractAddress}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          函数数量: {parsedAbi.length} ({readFunctions.length} 读取, {writeFunctions.length} 写入)
        </p>
        
        {/* 合约验证状态 */}
        {contractValidation.isChecking && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div className="flex items-center space-x-2">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">验证合约中...</span>
            </div>
          </div>
        )}
        
        {contractValidation.isValid === true && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">{contractValidation.message}</span>
            </div>
          </div>
        )}
        
        {contractValidation.isValid === false && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
            <div className="flex items-center space-x-2">
              <XCircle size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{contractValidation.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* 读取函数 */}
      {readFunctions.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Eye size={24} className="text-blue-500" />
            <span>查询函数 (只读)</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {readFunctions.map((func, index) => renderFunctionCard(func, true, index))}
          </div>
        </div>
      )}

      {/* 写入函数 */}
      {writeFunctions.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Send size={24} className="text-green-500" />
            <span>交易函数 (写入)</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {writeFunctions.map((func, index) => renderFunctionCard(func, false, index))}
          </div>
        </div>
      )}
    </div>
  );
}