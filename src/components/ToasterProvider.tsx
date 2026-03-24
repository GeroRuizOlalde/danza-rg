'use client'

import { Toaster } from 'react-hot-toast'

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.88rem',
          borderRadius: '12px',
        },
        success: {
          iconTheme: { primary: '#C97A96', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#EF4444', secondary: '#fff' },
        },
        duration: 3500,
      }}
    />
  )
}
