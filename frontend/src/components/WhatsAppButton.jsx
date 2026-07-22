import { useTranslation } from 'react-i18next'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || ''
const MESSAGE_TEMPLATE = import.meta.env.VITE_WHATSAPP_MESSAGE_TEMPLATE || "Hi! I'm interested in this dress:"

export default function WhatsAppButton({ instaUrl, productName }) {
  const { t } = useTranslation()
  const message = `${MESSAGE_TEMPLATE} ${productName || ''} ${instaUrl || ''}`.trim()
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
      <i className="bi bi-whatsapp me-1" /> {t('whatsappButton.label')}
    </a>
  )
}
