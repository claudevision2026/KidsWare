export function formatAgeGroup(ageGroup, yearsLabel = 'Years') {
  return `${ageGroup} ${yearsLabel}`
}

export function formatLocalPhoneNumber(phoneNumber) {
  return phoneNumber.length > 10 ? phoneNumber.slice(-10) : phoneNumber
}
