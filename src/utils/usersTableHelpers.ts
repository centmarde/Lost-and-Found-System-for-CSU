export const getRoleName = (roleId: number | undefined) => {
  switch (roleId) {
    case 1:
      return 'Admin'
    case 2:
      return 'User'
   /*  case 3:
      return 'Student'
    case 4:
      return 'Faculty' */
    default:
      return 'Unknown'
  }
}

export const getRoleColor = (roleId: number | undefined) => {
  switch (roleId) {
    case 1:
      return 'error'
    case 2:
      return 'warning'
    case 3:
      return 'primary'
    case 4:
      return 'success'
    default:
      return 'grey'
  }
}
