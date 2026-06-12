// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BubbleRegistry
 * @notice On-chain contact book + batch USDC sender for Bubble app
 *
 * Hai chức năng chính:
 *   1. saveContact   — lưu tên → địa chỉ ví trên blockchain (ai cũng verify được)
 *   2. batchSend     — gửi USDC đến nhiều ví trong 1 giao dịch duy nhất
 */

// Interface tối giản của ERC-20 (USDC là ERC-20 token)
// Chỉ cần 2 hàm: transferFrom (kéo tiền từ ví user) và transfer (gửi đi)
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract BubbleRegistry {

    // ── Storage ──────────────────────────────────────────────────────────────
    //
    // Mapping = "bảng tra cứu" trong Solidity
    // contacts[userAddress][name] = walletAddress
    // Ví dụ: contacts[0xAlice]["Mike"] = 0xMikeWallet
    mapping(address => mapping(string => address)) private contacts;

    // Lưu danh sách tên của mỗi user để có thể liệt kê
    mapping(address => string[]) private contactNames;

    // ── Events ────────────────────────────────────────────────────────────────
    //
    // Event = "log" được ghi vào blockchain, frontend có thể lắng nghe
    event ContactSaved(address indexed user, string name, address wallet);
    event ContactRemoved(address indexed user, string name);
    event BatchSent(address indexed sender, address token, uint256 recipientCount, uint256 totalAmount);

    // ── Contact Registry ──────────────────────────────────────────────────────

    /**
     * Lưu một contact vào blockchain
     * msg.sender = địa chỉ ví của người gọi hàm (tự động, không cần truyền vào)
     */
    function saveContact(string calldata name, address wallet) external {
        require(bytes(name).length > 0,   "Name cannot be empty");
        require(bytes(name).length <= 50, "Name too long");
        require(wallet != address(0),     "Invalid wallet address");
        require(wallet != msg.sender,     "Cannot save yourself");

        // Nếu chưa có tên này → thêm vào danh sách
        if (contacts[msg.sender][name] == address(0)) {
            contactNames[msg.sender].push(name);
        }

        contacts[msg.sender][name] = wallet;
        emit ContactSaved(msg.sender, name, wallet);
    }

    /**
     * Tra cứu địa chỉ ví từ tên
     * view = chỉ đọc, không tốn gas, không cần ký giao dịch
     */
    function getContact(address user, string calldata name) external view returns (address) {
        return contacts[user][name];
    }

    /**
     * Lấy toàn bộ danh bạ của một user
     * Trả về 2 mảng song song: names[i] → wallets[i]
     */
    function getContacts(address user) external view returns (string[] memory names, address[] memory wallets) {
        string[] storage nameList = contactNames[user];
        uint256 len = nameList.length;

        names   = new string[](len);
        wallets = new address[](len);

        for (uint256 i = 0; i < len; i++) {
            names[i]   = nameList[i];
            wallets[i] = contacts[user][nameList[i]];
        }
    }

    /**
     * Xóa một contact
     */
    function removeContact(string calldata name) external {
        require(contacts[msg.sender][name] != address(0), "Contact not found");
        delete contacts[msg.sender][name];

        // Xóa khỏi danh sách tên
        string[] storage nameList = contactNames[msg.sender];
        for (uint256 i = 0; i < nameList.length; i++) {
            if (keccak256(bytes(nameList[i])) == keccak256(bytes(name))) {
                nameList[i] = nameList[nameList.length - 1];
                nameList.pop();
                break;
            }
        }

        emit ContactRemoved(msg.sender, name);
    }

    // ── Batch Send ────────────────────────────────────────────────────────────

    /**
     * Gửi USDC đến nhiều địa chỉ trong 1 transaction
     *
     * Luồng hoạt động:
     *   1. User approve contract được phép dùng USDC của họ (1 lần)
     *   2. Contract kéo tổng USDC từ ví user (transferFrom)
     *   3. Contract gửi từng phần đến từng recipient (transfer)
     *
     * @param token      Địa chỉ USDC contract trên Arc Testnet
     * @param recipients Mảng địa chỉ nhận
     * @param amounts    Mảng số tiền tương ứng (đơn vị: wei, 1 USDC = 1_000_000 vì decimals=6)
     */
    function batchSend(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(token != address(0),                    "Invalid token");
        require(recipients.length > 0,                  "No recipients");
        require(recipients.length == amounts.length,    "Length mismatch");
        require(recipients.length <= 200,               "Max 200 recipients");

        // Tính tổng số tiền cần
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0,              "Amount must be > 0");
            require(recipients[i] != address(0), "Invalid recipient");
            total += amounts[i];
        }

        IERC20 usdc = IERC20(token);

        // Kiểm tra allowance trước — nếu chưa approve sẽ báo lỗi rõ ràng
        require(
            usdc.allowance(msg.sender, address(this)) >= total,
            "Insufficient allowance: call approve() first"
        );

        // Kéo tổng tiền từ ví user vào contract
        require(usdc.transferFrom(msg.sender, address(this), total), "Pull failed");

        // Gửi lần lượt đến từng người nhận
        for (uint256 i = 0; i < recipients.length; i++) {
            require(usdc.transfer(recipients[i], amounts[i]), "Send failed");
        }

        emit BatchSent(msg.sender, token, recipients.length, total);
    }

    /**
     * Tính tổng số tiền cần cho một batch (để frontend hiển thị trước khi confirm)
     */
    function calcTotal(uint256[] calldata amounts) external pure returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        return total;
    }
}
