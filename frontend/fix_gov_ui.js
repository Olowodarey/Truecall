const fs = require('fs');
const path = '/home/olowo/Desktop/truecall1/frontend/app/governance/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the stake banner (line ~201) that still references old stakeBalance state var
// "isConnected && stakeBalance > 0" and "stakeBalance < config.minStake"
// The computed stakeBalance var is still there (derived from stakeInfo?.stxBalance ?? 0)
// so those refs should still work.
// BUT the "loading" spinner on Create tab should show while stakeInfo is loading

// Add stakeAge info to the stake banner
const bannerOld = `          {isConnected && stakeBalance > 0 && (
            <div className="mb-6 bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-gray-300 text-sm">
                Your stake:{" "}
                <span className="text-white font-semibold">
                  {(stakeBalance / 1e6).toFixed(2)} STX
                </span>
                {stakeBalance < (config?.minStake ?? 0) ? (
                  <span className="text-red-400 ml-2">
                    (below {(config!.minStake / 1e6).toFixed(0)} STX min — stake
                    more to participate)
                  </span>
                ) : (
                  <span className="text-green-400 ml-2">
                    ✓ Eligible to vote & propose
                  </span>
                )}
              </p>
            </div>
          )}`;

const bannerNew = `          {isConnected && stakeBalance > 0 && (
            <div className="mb-6 bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <div className="flex-1">
                <p className="text-gray-300 text-sm">
                  Your stake:{" "}
                  <span className="text-white font-semibold">
                    {(stakeBalance / 1e6).toFixed(2)} STX
                  </span>
                  {stakeBalance < (config?.minStake ?? 0) ? (
                    <span className="text-red-400 ml-2">
                      (below {(config!.minStake / 1e6).toFixed(0)} STX min)
                    </span>
                  ) : canCreateProposal ? (
                    <span className="text-green-400 ml-2">✓ Eligible to vote &amp; propose</span>
                  ) : (
                    <span className="text-yellow-400 ml-2">
                      Stake maturing: {stakeAge}/{config?.minStakeAge ?? 144} blocks
                    </span>
                  )}
                </p>
                {!canCreateProposal && stakeBalance >= (config?.minStake ?? 0) && (
                  <div className="mt-1.5 w-full bg-gray-700 rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-orange-500 to-green-500 transition-all"
                      style={{ width: \`\${Math.min(100, (stakeAge / (config?.minStakeAge ?? 144)) * 100)}%\` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}`;

if (content.includes(bannerOld)) {
  content = content.replace(bannerOld, bannerNew);
  console.log('Banner updated');
} else {
  console.log('Banner not found!');
  // Show snippet around stake banner
  const idx = content.indexOf('isConnected && stakeBalance > 0');
  if (idx > -1) console.log('Found at:', idx, content.slice(idx, idx+200));
}

// Fix "Insufficient Stake" text to also mention stake age
const insufficientOld = `                  <p className="text-gray-400">
                    You need at least{" "}
                    <span className="text-white font-semibold">
                      {config ? (config.minStake / 1e6).toFixed(0) : "?"} STX
                    </span>{" "}
                    staked for at least{" "}
                    <span className="text-white font-semibold">
                      {config?.minStakeAge} blocks
                    </span>{" "}
                    to create a proposal.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Your current stake: {(stakeBalance / 1e6).toFixed(2)} STX
                  </p>`;

const insufficientNew = `                  <p className="text-gray-400">
                    You need at least{" "}
                    <span className="text-white font-semibold">
                      {config ? (config.minStake / 1e6).toFixed(0) : "?"} STX
                    </span>{" "}
                    staked for at least{" "}
                    <span className="text-white font-semibold">
                      {config?.minStakeAge ?? 144} blocks
                    </span>{" "}
                    to create a proposal.
                  </p>
                  <div className="text-gray-500 text-sm mt-3 space-y-1">
                    <p>Balance: <span className="text-white">{(stakeBalance / 1e6).toFixed(4)} STX</span>
                      {stakeBalance < (config?.minStake ?? 0) && <span className="text-red-400"> (need {(config!.minStake / 1e6).toFixed(0)} STX)</span>}
                    </p>
                    <p>Stake age: <span className="text-white">{stakeAge}</span> / {config?.minStakeAge ?? 144} blocks
                      {stakeAge < (config?.minStakeAge ?? 0) && <span className="text-yellow-400"> (maturing…)</span>}
                    </p>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full bg-orange-500 transition-all"
                        style={{ width: \`\${Math.min(100, (stakeAge / (config?.minStakeAge ?? 144)) * 100)}%\` }} />
                    </div>
                  </div>`;

if (content.includes(insufficientOld)) {
  content = content.replace(insufficientOld, insufficientNew);
  console.log('Insufficient message updated');
} else {
  console.log('Insufficient message not found!');
}

fs.writeFileSync(path, content);
