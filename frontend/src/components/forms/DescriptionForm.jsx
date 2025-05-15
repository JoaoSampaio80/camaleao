import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

export default function DescriptionForm({label, rows, value, name, onChange, onBlur}) {
  return (    
        <TextField
          id="outlined-multiline-static"
          sx={{width:'100%'}}
          label={label}
          multiline
          rows={rows}
          value={value}
          name={name}
          onChange={onChange}
          onBlur={onBlur}        
        />      
  );
}