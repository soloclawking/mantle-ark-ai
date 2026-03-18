// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ArkVault — On-chain Inheritance Protocol for Mantle
/// @notice Dead man's switch vault that distributes assets to beneficiaries after owner inactivity
/// @dev Designed for Mantle Network (gas token: MNT)
contract ArkVault {

    // ========== STRUCTS ==========

    struct Beneficiary {
        address wallet;
        string name;
        uint256 percentage; // basis points (100 = 1%)
        bool claimed;
    }

    // ========== STATE ==========

    address public owner;
    uint256 public lastHeartbeat;
    uint256 public inactivityPeriod;  // seconds
    uint256 public gracePeriod;       // seconds
    bool public isTriggered;
    uint256 public triggerTimestamp;
    bool public isExecuted;

    Beneficiary[] public beneficiaries;
    uint256 public totalPercentage; // total in basis points (10000 = 100%)

    bool public exitDefiBeforeDistribute;
    bool public revokeApprovalsBeforeDistribute;

    // ========== EVENTS ==========

    event HeartbeatSent(address indexed owner, uint256 timestamp);
    event VaultConfigured(uint256 beneficiaryCount, uint256 inactivityPeriod, uint256 gracePeriod);
    event BeneficiaryAdded(address indexed wallet, string name, uint256 percentage);
    event BeneficiaryRemoved(address indexed wallet);
    event SwitchTriggered(uint256 timestamp, uint256 executionTime);
    event SwitchCancelled(uint256 timestamp);
    event InheritanceExecuted(uint256 timestamp, uint256 totalDistributed);
    event FundsDistributed(address indexed beneficiary, uint256 amount);
    event FundsDeposited(address indexed sender, uint256 amount);
    event EmergencyWithdraw(address indexed owner, uint256 amount);
    event SettingsUpdated(uint256 inactivityPeriod, uint256 gracePeriod);

    // ========== MODIFIERS ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "ArkVault: not owner");
        _;
    }

    modifier notExecuted() {
        require(!isExecuted, "ArkVault: already executed");
        _;
    }

    // ========== CONSTRUCTOR ==========

    /// @notice Deploy the Ark Vault
    /// @param _inactivityPeriod Seconds of inactivity before trigger
    /// @param _gracePeriod Seconds of grace period after trigger
    constructor(uint256 _inactivityPeriod, uint256 _gracePeriod) {
        require(_inactivityPeriod >= 7 days, "ArkVault: min 7 days inactivity");
        require(_gracePeriod >= 1 days, "ArkVault: min 1 day grace");

        owner = msg.sender;
        inactivityPeriod = _inactivityPeriod;
        gracePeriod = _gracePeriod;
        lastHeartbeat = block.timestamp;

        emit VaultConfigured(0, _inactivityPeriod, _gracePeriod);
    }

    // ========== RECEIVE MNT ==========

    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    // ========== OWNER FUNCTIONS ==========

    /// @notice Send heartbeat to prove owner is alive (resets the timer)
    function heartbeat() external onlyOwner notExecuted {
        lastHeartbeat = block.timestamp;

        // Cancel trigger if active
        if (isTriggered) {
            isTriggered = false;
            triggerTimestamp = 0;
            emit SwitchCancelled(block.timestamp);
        }

        emit HeartbeatSent(msg.sender, block.timestamp);
    }

    /// @notice Add a beneficiary
    /// @param _wallet Beneficiary wallet address
    /// @param _name Human-readable name
    /// @param _percentage Percentage in basis points (e.g., 5000 = 50%)
    function addBeneficiary(
        address _wallet,
        string calldata _name,
        uint256 _percentage
    ) external onlyOwner notExecuted {
        require(_wallet != address(0), "ArkVault: zero address");
        require(_percentage > 0 && _percentage <= 10000, "ArkVault: invalid percentage");
        require(totalPercentage + _percentage <= 10000, "ArkVault: exceeds 100%");

        beneficiaries.push(Beneficiary({
            wallet: _wallet,
            name: _name,
            percentage: _percentage,
            claimed: false
        }));

        totalPercentage += _percentage;
        emit BeneficiaryAdded(_wallet, _name, _percentage);
    }

    /// @notice Remove a beneficiary by index
    function removeBeneficiary(uint256 _index) external onlyOwner notExecuted {
        require(_index < beneficiaries.length, "ArkVault: invalid index");

        address wallet = beneficiaries[_index].wallet;
        totalPercentage -= beneficiaries[_index].percentage;

        // Swap and pop
        beneficiaries[_index] = beneficiaries[beneficiaries.length - 1];
        beneficiaries.pop();

        emit BeneficiaryRemoved(wallet);
    }

    /// @notice Update timing settings
    function updateSettings(
        uint256 _inactivityPeriod,
        uint256 _gracePeriod
    ) external onlyOwner notExecuted {
        require(_inactivityPeriod >= 7 days, "ArkVault: min 7 days");
        require(_gracePeriod >= 1 days, "ArkVault: min 1 day");

        inactivityPeriod = _inactivityPeriod;
        gracePeriod = _gracePeriod;

        emit SettingsUpdated(_inactivityPeriod, _gracePeriod);
    }

    /// @notice Emergency withdraw all funds (only before execution)
    function emergencyWithdraw() external onlyOwner notExecuted {
        uint256 balance = address(this).balance;
        require(balance > 0, "ArkVault: no funds");

        (bool sent, ) = payable(owner).call{value: balance}("");
        require(sent, "ArkVault: withdraw failed");

        emit EmergencyWithdraw(owner, balance);
    }

    // ========== TRIGGER FUNCTIONS ==========

    /// @notice Anyone can trigger the switch if inactivity period has passed
    function triggerSwitch() external notExecuted {
        require(!isTriggered, "ArkVault: already triggered");
        require(
            block.timestamp >= lastHeartbeat + inactivityPeriod,
            "ArkVault: owner still active"
        );

        isTriggered = true;
        triggerTimestamp = block.timestamp;

        emit SwitchTriggered(block.timestamp, block.timestamp + gracePeriod);
    }

    /// @notice Execute the inheritance distribution after grace period
    function executeInheritance() external notExecuted {
        require(isTriggered, "ArkVault: not triggered");
        require(
            block.timestamp >= triggerTimestamp + gracePeriod,
            "ArkVault: grace period active"
        );
        require(beneficiaries.length > 0, "ArkVault: no beneficiaries");
        require(totalPercentage > 0, "ArkVault: no allocation");

        isExecuted = true;
        uint256 totalBalance = address(this).balance;
        uint256 totalDistributed = 0;

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i].claimed) continue;

            uint256 share = (totalBalance * beneficiaries[i].percentage) / 10000;
            beneficiaries[i].claimed = true;

            if (share > 0) {
                (bool sent, ) = payable(beneficiaries[i].wallet).call{value: share}("");
                if (sent) {
                    totalDistributed += share;
                    emit FundsDistributed(beneficiaries[i].wallet, share);
                }
            }
        }

        emit InheritanceExecuted(block.timestamp, totalDistributed);
    }

    // ========== VIEW FUNCTIONS ==========

    /// @notice Get number of beneficiaries
    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    /// @notice Check if the switch can be triggered
    function canTrigger() external view returns (bool) {
        return !isTriggered
            && !isExecuted
            && block.timestamp >= lastHeartbeat + inactivityPeriod;
    }

    /// @notice Check if inheritance can be executed
    function canExecute() external view returns (bool) {
        return isTriggered
            && !isExecuted
            && block.timestamp >= triggerTimestamp + gracePeriod;
    }

    /// @notice Time remaining until trigger is possible (0 if already possible)
    function timeUntilTrigger() external view returns (uint256) {
        uint256 triggerTime = lastHeartbeat + inactivityPeriod;
        if (block.timestamp >= triggerTime) return 0;
        return triggerTime - block.timestamp;
    }

    /// @notice Time remaining in grace period (0 if expired)
    function timeUntilExecution() external view returns (uint256) {
        if (!isTriggered) return inactivityPeriod + gracePeriod;
        uint256 execTime = triggerTimestamp + gracePeriod;
        if (block.timestamp >= execTime) return 0;
        return execTime - block.timestamp;
    }

    /// @notice Get vault status
    function getStatus() external view returns (
        string memory status,
        uint256 balance,
        uint256 _lastHeartbeat,
        uint256 _beneficiaryCount
    ) {
        if (isExecuted) {
            status = "EXECUTED";
        } else if (isTriggered) {
            if (block.timestamp >= triggerTimestamp + gracePeriod) {
                status = "READY_TO_EXECUTE";
            } else {
                status = "GRACE_PERIOD";
            }
        } else if (block.timestamp >= lastHeartbeat + inactivityPeriod) {
            status = "CAN_TRIGGER";
        } else {
            status = "ACTIVE";
        }

        balance = address(this).balance;
        _lastHeartbeat = lastHeartbeat;
        _beneficiaryCount = beneficiaries.length;
    }
}
