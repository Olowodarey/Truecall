const fs = require('fs');
const path = '/home/olowo/Desktop/truecall1/frontend/app/governance/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldLoad = `  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [propsData, cfgData, blockInfo] = await Promise.all([
        getAllProposals(30),
        getGovernanceConfig(),
        fetch(\`\x24{HIRO_API}/v2/info\`).then((r) => r.json()),
      ]);
      setProposals(propsData);
      setConfig(cfgData);
      setCurrentBlock(blockInfo.stacks_tip_height ?? 0);

      if (isConnected && userAddress) {
        const stakeInfo = await getStakeInfo(userAddress);
        setStakeBalance(stakeInfo.stxBalance);

        const votes: Record<number, { vote: boolean; power: number }> = {};
        await Promise.all(
          propsData.map(async (p) => {
            const v = await getUserVote(p.id, userAddress);
            if (v) votes[p.id] = v;
          }),
        );
        setUserVotes(votes);
      }
    } catch (err) {
      console.error("Failed to load governance data:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, userAddress]);`;

const newLoad = `  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const cfgData = await getGovernanceConfig();
      setConfig(cfgData);
      
      const blockInfo = await fetch(\`\x24{HIRO_API}/v2/info\`).then((r) => r.json());
      setCurrentBlock(blockInfo.stacks_tip_height ?? 0);

      const propsData = await getAllProposals(30);
      setProposals(propsData);

      if (isConnected && userAddress) {
        const stakeInfo = await getStakeInfo(userAddress);
        setStakeBalance(stakeInfo.stxBalance);

        const votes: Record<number, { vote: boolean; power: number }> = {};
        for (let i = 0; i < propsData.length; i += 2) {
          const batch = propsData.slice(i, i + 2);
          await Promise.all(batch.map(async (p) => {
            const v = await getUserVote(p.id, userAddress);
            if (v) votes[p.id] = v;
          }));
        }
        setUserVotes(votes);
      }
    } catch (err) {
      console.error("Failed to load governance data:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, userAddress]);`;

if (content.includes(oldLoad)) {
  content = content.replace(oldLoad, newLoad);
  fs.writeFileSync(path, content);
  console.log('Successfully fixed loadData rate limiting issue!');
} else {
  console.log('Could not find exact oldLoad match. Check lines.');
}
