import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-ethers'
import * as dotenv from 'dotenv'

dotenv.config({ path: 'C:\\Users\\PC\\Downloads\\Bubble\\bubblepay\\.env.local' })

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  paths: {
    sources: './src',
    cache:    './cache',
    artifacts:'./artifacts',
  },
  networks: {
    arc: {
      url: 'https://rpc.testnet.arc.network',
      chainId: 5042002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [`0x${process.env.DEPLOYER_PRIVATE_KEY.replace(/^0x/, '')}`]
        : [],
    },
  },
}

export default config
