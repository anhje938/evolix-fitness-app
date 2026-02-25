export function getRelativeDateLabel(dateString: string) {
    // convert yyyy mm dd string into a date object
    const target = new Date(dateString)
  
    // get todays date
    const today = new Date()
  
    // normalize both dates to midnight so comparison is only about the date
    const t = new Date(target.getFullYear(), target.getMonth(), target.getDate())
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
    // calculate difference in days
    const diffMs = now.getTime() - t.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
  
    // today
    if (diffDays === 0) return "Idag"
  
    // yesterday
    if (diffDays === 1) return "Igår"
  
    // last seven days
    if (diffDays >= 2 && diffDays <= 6) {
      return t.toLocaleDateString("nb-NO", { weekday: "long" })
    }
  
    // fallback date in yyyy mm dd format
    const year = t.getFullYear()
    const month = String(t.getMonth() + 1).padStart(2, "0")
    const day = String(t.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  