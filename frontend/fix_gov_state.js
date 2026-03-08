const fs = require('fs');
const path = '/home/olowo/Desktop/truecall1/frontend/app/governance/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update imports
const importOld = `  expireProposal,
  type GovernanceConfig,
} from "@/lib/stacks";`;
const importNew = `  expireProposal,
  type GovernanceConfig,
} from "@/lib/stacks";
import type { ChainStakeInfo } from "@/lib/types";`;
if (content.includes(importOld)) {
  content = content.replace(importOld, importNew);
  console.log("Imports updated");
}

// 2. Update state declarations
const stateOld = `  const [currentBlock, setCurrentBlock] = useState(0);
  const [stakeBalance, setStakeBalance] = useState(0);`;
const stateNew = `  const [currentBlock, setCurrentBlock] = useState(0);
  const [stakeInfo, setStakeInfo] = useState<ChainStakeInfo | null>(null);`;
if (content.includes(stateOld)) {
  content = content.replace(stateOld, stateNew);
  console.log("State updated");
}

// 3. Update loadData setStakeInfo
const setStakeOld = `      if (isConnected && userAddress) {
        const stakeInfo = await getStakeInfo(userAddress);
        setStakeBalance(stakeInfo.stxBalance);`;
const setStakeNew = `      if (isConnected && userAddress) {
        const info = await getStakeInfo(userAddress);
        setStakeInfo(info);`;
if (content.includes(setStakeOld)) {
  content = content.replace(setStakeOld, setStakeNew);
  console.log("loadData updated");
}

// 4. Update helper variables
const helpersOld = `  const canCreateProposal =
    isConnected && stakeBalance >= (config?.minStake ?? Infinity);`;
const helpersNew = `  const stakeBalance = stakeInfo?.stxBalance ?? 0;
  const stakeAge = stakeInfo && stakeInfo.stxStakedAt > 0
    ? Math.max(0, currentBlock - stakeInfo.stxStakedAt)
    : 0;
  const canCreateProposal =
    isConnected &&
    stakeBalance >= (config?.minStake ?? Infinity) &&
    stakeAge >= (config?.minStakeAge ?? Infinity);`;
if (content.includes(helpersOld)) {
  content = content.replace(helpersOld, helpersNew);
  console.log("Helpers updated");
}

fs.writeFileSync(path, content);
