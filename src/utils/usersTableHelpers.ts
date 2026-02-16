// This function is deprecated - use roles store instead
export const getRoleName = (roleId: number | undefined) => {
  console.warn('getRoleName is deprecated - use roles store instead');

  if (!roleId) return 'No Role'

  // For backward compatibility only
  switch (roleId) {
    case 1:
      return 'Admin'
    case 2:
      return 'User'
    case 3:
      return 'Student'
    case 4:
      return 'Faculty'
    default:
      return 'Unknown Role'
  }
}

export const getRoleColor = (roleId: number | undefined) => {
  if (!roleId) return 'grey'

  switch (roleId) {
    case 1:
      return 'error'      // Admin - red
    case 2:
      return 'warning'    // User - orange
    case 3:
      return 'primary'    // Student - blue
    case 4:
      return 'success'    // Faculty - green
    default:
      return 'grey'       // Unknown - grey
  }
}
