import { ethers } from 'hardhat'

async function main() {
  console.log('Deploying BubbleRegistry to Arc Testnet...\n')
  console.log('DEBUG - DEPLOYER_PRIVATE_KEY set:', !!process.env.DEPLOYER_PRIVATE_KEY)

  const signers = await ethers.getSigners()
  if (signers.length === 0) {
    throw new Error('No signers — DEPLOYER_PRIVATE_KEY not loaded. Check .env.local path.')
  }
  const [deployer] = signers
  console.log('Deployer address:', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Deployer balance:', ethers.formatUnits(balance, 6), 'USDC\n')

  const BubbleRegistry = await ethers.getContractFactory('BubbleRegistry')
  const registry = await BubbleRegistry.deploy()
  await registry.waitForDeployment()

  const address = await registry.getAddress()
  console.log('✅ BubbleRegistry deployed at:', address)
  console.log('🔍 View on ArcScan:', `https://testnet.arcscan.app/address/${address}`)
  console.log('\nAdd this to your .env.local:')
  console.log(`NEXT_PUBLIC_BUBBLE_REGISTRY=${address}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
