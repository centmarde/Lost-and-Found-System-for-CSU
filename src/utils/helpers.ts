/**
 * Utility functions for the application
 */

/**
 * Generates initials from an email address for avatar display
 * @param email - The email address to extract initials from
 * @returns A string of 1-2 uppercase letters representing the user's initials
 */
export function getEmailInitials(email: string | null | undefined): string {
  if (!email) return 'U'; // Default to 'U' for User if no email

  // Extract the local part (before @) from email
  const localPart = email.split('@')[0];

  // Split by common separators (dots, underscores, hyphens, numbers)
  const parts = localPart.split(/[\._\-\d]+/).filter(part => part.length > 0);

  if (parts.length >= 2) {
    // Take first letter of first two parts
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    // Take first two letters of single part
    return (parts[0][0] + parts[0][1]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length === 1) {
    // Single letter part
    return parts[0][0].toUpperCase();
  }

  // Fallback: take first letter of email
  return email[0].toUpperCase();
}

/**
 * Generates a display name from user data
 * @param userData - User data object containing name/email information
 * @returns A formatted display name
 */
export function getUserDisplayName(userData: {
  user_metadata?: { full_name?: string };
  email?: string
} | null): string {
  if (!userData) return 'User';

  const fullName = userData.user_metadata?.full_name;
  if (fullName) return fullName;

  if (userData.email) {
    // Extract name from email (part before @)
    const emailLocal = userData.email.split('@')[0];
    // Replace dots/underscores with spaces and capitalize
    return emailLocal.replace(/[\._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'User';
}

/**
 * Formats a date string into a human-readable format
 * @param dateString - The date string to format
 * @returns A formatted date string in 'MMM d, yyyy, h:mm AM/PM' format
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================================================
// Activity-related utilities
// ============================================================================

export interface ActivityItem {
  id: string;
  type: "lost" | "found" | "resolved" | "claimed";
  title: string;
  user: string;
  timestamp: string;
  status: string;
}

/**
 * Get the Vuetify color for an activity type
 * @param type - The activity type
 * @returns A Vuetify color name
 */
export function getActivityColor(type: string): string {
  switch (type) {
    case "lost":
      return "error";
    case "found":
      return "success";
    case "resolved":
      return "primary";
    case "claimed":
      return "info";
    default:
      return "grey";
  }
}

/**
 * Get the Material Design icon for an activity type
 * @param type - The activity type
 * @returns A Material Design icon name
 */
export function getActivityIcon(type: string): string {
  switch (type) {
    case "lost":
      return "mdi-alert-circle";
    case "found":
      return "mdi-check-circle";
    case "resolved":
      return "mdi-handshake";
    case "claimed":
      return "mdi-account-check";
    default:
      return "mdi-circle";
  }
}

/**
 * Format a timestamp into a human-readable relative time
 * @param timestamp - The timestamp string to format
 * @returns A formatted relative time string (e.g., "5 minutes ago", "2 days ago")
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Filter activities by age and limit the number of items
 * @param activities - Array of activity items to filter
 * @param maxItems - Maximum number of items to return (default: 10)
 * @param maxDays - Maximum age of activities in days (default: 7)
 * @returns Filtered and limited array of activities
 */
export function filterRecentActivities(
  activities: ActivityItem[],
  maxItems: number = 10,
  maxDays: number = 7
): ActivityItem[] {
  const now = new Date();
  const maxAge = maxDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
  
  return activities
    .filter(activity => {
      const activityDate = new Date(activity.timestamp);
      const age = now.getTime() - activityDate.getTime();
      return age <= maxAge; // Only include items within the time window
    })
    .slice(0, maxItems); // Limit to max number of items
}