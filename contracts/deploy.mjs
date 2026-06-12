import { ethers } from 'ethers'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env.local') })

// Compile contract ABI + bytecode using solc
// Paste ABI và bytecode từ Remix sau khi compile, hoặc dùng solcjs
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY
if (!PRIVATE_KEY) {
  console.error('❌ DEPLOYER_PRIVATE_KEY not set in .env.local')
  process.exit(1)
}

// ABI của BubbleRegistry
const ABI = [
  "function saveContact(string name, address wallet) external",
  "function getContact(address user, string name) external view returns (address)",
  "function getContacts(address user) external view returns (string[] names, address[] wallets)",
  "function removeContact(string name) external",
  "function batchSend(address token, address[] recipients, uint256[] amounts) external",
  "function calcTotal(uint256[] amounts) external pure returns (uint256)",
  "event ContactSaved(address indexed user, string name, address wallet)",
  "event BatchSent(address indexed sender, address token, uint256 recipientCount, uint256 totalAmount)"
]

// Bytecode từ Remix sau khi compile (bạn cần paste vào đây)
// Hướng dẫn: Remix → Compile → ABI button → copy Bytecode
const BYTECODE = process.env.CONTRACT_BYTECODE

if (!BYTECODE) {
  console.log('ℹ️  Chưa có bytecode. Làm theo hướng dẫn:')
  console.log('1. Mở remix.ethereum.org')
  console.log('2. Paste contract, compile với 0.8.20')
  console.log('3. Click "Compilation Details" → copy Bytecode (object field)')
  console.log('4. Thêm vào .env.local: CONTRACT_BYTECODE=0x...')
  process.exit(0)
}

async function deploy() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network')
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('Deployer:', wallet.address)

  const factory  = new ethers.ContractFactory(ABI, BYTECODE, wallet)
  const contract = await factory.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log('\n✅ BubbleRegistry deployed at:', address)
  console.log('🔍 ArcScan:', `https://testnet.arcscan.app/address/${address}`)
  console.log('\nThêm vào .env.local:')
  console.log(`NEXT_PUBLIC_BUBBLE_REGISTRY=${address}`)
}

deploy().catch(console.error)
