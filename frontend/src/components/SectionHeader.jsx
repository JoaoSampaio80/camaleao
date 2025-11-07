// src/components/SectionHeader.jsx
import React from 'react';

const COLORS = { darkTitle: '#071744' };

export default function SectionHeader({ title }) {
  return (
    <h5
      style={{
        color: COLORS.darkTitle,
        fontWeight: 700,
        marginBottom: '0.5rem',
      }}
    >
      {title}
    </h5>
  );
}
