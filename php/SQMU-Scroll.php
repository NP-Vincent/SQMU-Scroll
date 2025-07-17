<?php
/**
 * Plugin Name: SQMU Scroll Widgets
 * Description: Provides WordPress shortcodes for SQMU mint and transfer functionality using MetaMask.
 * Version: 0.2
 */

if (!defined('ABSPATH')) exit;

function sqmu_mint_widget_assets() {
    // Only enqueue ethers and Metamask SDK if shortcode is present
    if (is_singular() && has_shortcode(get_post()->post_content, 'sqmu_mint_widget')) {
        $cdn_base = 'https://np-vincent.github.io/SQMU-Scroll/';
        wp_enqueue_script('ethers', 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js', [], null, true);
        wp_enqueue_script('metamask-sdk', $cdn_base . 'metamask-sdk.js', [], null, true);
        wp_enqueue_script('web3auth', $cdn_base . 'web3auth.js', [], null, true);
        wp_enqueue_script('safe-core', $cdn_base . 'safe-core-sdk.js', [], null, true);
        wp_enqueue_script('across-sdk', $cdn_base . 'across-sdk.js', [], null, true);
    }
}
add_action('wp_enqueue_scripts', 'sqmu_mint_widget_assets');

function sqmu_mint_widget_shortcode($atts) {
    ob_start(); ?>
<div id="sqmu-mint-widget" style="max-width: 480px; margin:2em auto; padding:2em; border:1px solid #eee; border-radius:8px;">
    <h3>SQMU Mint Widget</h3>
    <button id="connect">Connect Wallet</button>
    <button id="disconnect">Disconnect</button>
    <div style="margin-top:1em;">
        <label>Token ID <input id="token-id" type="text"></label>
        <label>Amount <input id="token-amount" type="number" value="1"></label>
        <label>URI <input id="token-uri" type="text" value="0x"></label>
        <button id="mint">Mint</button>
        <div id="mint-status"></div>
    </div>
    <div style="margin-top:1em;">
        <label>Address <input id="wallet-address" type="text" placeholder="optional"></label>
        <button id="check-balance">Check Balance</button>
        <div id="balance-status"></div>
    </div>
    <div style="margin-top:1em;">
        <label>Recipient <input id="recipient" type="text"></label>
        <label>Data <input id="transfer-data" type="text" value="0x"></label>
        <button id="transfer">Transfer</button>
        <div id="transfer-status"></div>
    </div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
    if (!window.MetaMaskSDK || !window.ethers) return;
    const MMSDK = new MetaMaskSDK.MetaMaskSDK({
      dappMetadata: { name: 'SQMU Mint Widget', url: window.location.href },
      infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
    });
    let provider, signer, contract;

    <?php
    $abi_path = plugin_dir_path(__FILE__) . '../abi/SQMU.json';
    $abi_json = file_get_contents($abi_path);
    ?>
    const sqmuAbi = <?php echo $abi_json; ?>;
    const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';
    const SCROLL_CHAIN_ID = '0x82750';

    // Connect wallet logic (same as your HTML version)
    async function connect() {
        const ethereum = MMSDK.getProvider();
        const statusDiv = document.getElementById('mint-status');
        statusDiv.innerText = 'Connecting to MetaMask...';

        try {
          const permissions = await ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          });
          const accountsPermission = permissions.find(
            (p) => p.parentCapability === 'eth_accounts'
          );
          if (!accountsPermission) throw new Error('eth_accounts permission not granted');
          await ethereum.request({ method: 'eth_requestAccounts', params: [] });
          let chainId = await ethereum.request({ method: 'eth_chainId', params: [] });
          if (chainId !== SCROLL_CHAIN_ID) {
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: SCROLL_CHAIN_ID }],
            });
            chainId = await ethereum.request({ method: 'eth_chainId', params: [] });
          }
          provider = new ethers.providers.Web3Provider(ethereum);
          signer = provider.getSigner();
          contract = new ethers.Contract(contractAddress, sqmuAbi.abi, signer);
          statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll. Contract ready!</span>';
        } catch (err) {
          statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
        }
    }
    async function mintToken() {
        const statusDiv = document.getElementById('mint-status');
        const tokenId = document.getElementById('token-id').value;
        const amount = document.getElementById('token-amount').value;
        const uriData = document.getElementById('token-uri').value || '0x';
        if (!contract) {
          statusDiv.innerHTML = '<span style="color:red;">Connect wallet first.</span>';
          return;
        }
        try {
          const account = await signer.getAddress();
          const tx = await contract.mint(account, tokenId, amount, uriData);
          statusDiv.innerText = 'Minting...';
          await tx.wait();
          statusDiv.innerHTML = `<span style="color:green;">Minted token ${tokenId} x ${amount}</span>`;
        } catch (err) {
          statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
        }
    }
    async function checkBalance() {
        const statusDiv = document.getElementById('balance-status');
        const tokenId = document.getElementById('token-id').value;
        let addr = document.getElementById('wallet-address').value;
        if (!contract) {
          statusDiv.innerHTML = '<span style="color:red;">Connect wallet first.</span>';
          return;
        }
        try {
          if (!addr) addr = await signer.getAddress();
          const bal = await contract.balanceOf(addr, tokenId);
          statusDiv.innerHTML = `<span style="color:green;">Balance: ${bal.toString()}</span>`;
        } catch (err) {
          statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
        }
    }
    async function transferToken() {
        const statusDiv = document.getElementById('transfer-status');
        const tokenId = document.getElementById('token-id').value;
        const amount = document.getElementById('token-amount').value;
        const to = document.getElementById('recipient').value;
        const data = document.getElementById('transfer-data').value || '0x';
        if (!contract) {
          statusDiv.innerHTML = '<span style="color:red;">Connect wallet first.</span>';
          return;
        }
        try {
          const from = await signer.getAddress();
          const tx = await contract.safeTransferFrom(from, to, tokenId, amount, data);
          statusDiv.innerText = 'Transferring...';
          await tx.wait();
          statusDiv.innerHTML = '<span style="color:green;">Transfer complete</span>';
        } catch (err) {
          statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
        }
    }
    async function disconnect() {
        const ethereum = MMSDK.getProvider();
        const statusDiv = document.getElementById('mint-status');
        try {
          await ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          });
          provider = undefined; signer = undefined; contract = undefined;
          statusDiv.innerHTML = '<span style="color:orange;">Disconnected</span>';
        } catch (err) {
          statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
        }
    }
    document.getElementById('connect').addEventListener('click', connect);
    document.getElementById('disconnect').addEventListener('click', disconnect);
    document.getElementById('mint').addEventListener('click', mintToken);
    document.getElementById('check-balance').addEventListener('click', checkBalance);
    document.getElementById('transfer').addEventListener('click', transferToken);
});
</script>
    <?php
    return ob_get_clean();
}
add_shortcode('sqmu_mint_widget', 'sqmu_mint_widget_shortcode');

