import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

export default function TextForm({label}) {
  return (        
      <TextField 
        id="standard-basic"
        sx={{width:'100%'}} 
        label={label}
        variant="outlined" 
      />    
  );
}
