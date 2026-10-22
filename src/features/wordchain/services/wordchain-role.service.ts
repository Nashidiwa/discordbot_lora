import { WordChainConstants } from '../wordchain.constants.js';

export interface MemberStatsForRole {
  karma: number;
  correctInputs: number;
  wrongInputs: number;
}

/**
 * Service managing eligibility calculations for Word Chain roles (Reliable and Failed).
 * Pure domain logic decoupled from Discord Gateway event listeners.
 */
export class WordChainRoleService {
  /**
   * Computes whether a member meets the requirements for the Reliable Role:
   * 1. Total inputs (correct + wrong) > 0
   * 2. Accuracy = correct / (correct + wrong) > 0.975 (97.5%)
   * 3. Accumulated karma > 25.0
   * Reference: cogs/common.py:302-303 (strictly greater than).
   */
  public isEligibleForReliableRole(stats: MemberStatsForRole): boolean {
    const totalInputs = stats.correctInputs + stats.wrongInputs;
    if (totalInputs <= 0) {
      return false;
    }

    const accuracy = stats.correctInputs / totalInputs;
    return (
      stats.karma > WordChainConstants.RELIABLE_ROLE_KARMA_THRESHOLD &&
      accuracy > WordChainConstants.RELIABLE_ROLE_ACCURACY_THRESHOLD
    );
  }

  /**
   * Computes whether a failed member has completed the required 30 correct inputs
   * to earn redemption and have the Failed Role stripped.
   * Reference: cogs/game.py:291.
   */
  public hasClearedFailedRole(correctInputsByFailedMember: number): boolean {
    return correctInputsByFailedMember >= WordChainConstants.FAILED_ROLE_RECOVERY_INPUTS;
  }

  /**
   * Checks whether the bot has the hierarchical authority to assign or remove a role.
   * In Discord, a bot cannot manage roles at or above its highest role position.
   */
  public canManageRoleHierarchy(
    botHighestRolePosition: number,
    targetRolePosition: number,
  ): boolean {
    return botHighestRolePosition > targetRolePosition;
  }
}
