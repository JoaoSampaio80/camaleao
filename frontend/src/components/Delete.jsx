import { React, useState, useEffect } from "react";
import AxiosInstance from './Axios';
import { Box, Button, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import MyMessage from './forms/Message';
import { useNavigate, useParams } from 'react-router';

const Delete = () => {
    const MyParameter = useParams()
    const navigate = useNavigate()
    const MyId = MyParameter.id
            
    const [message, setMessage] = useState([])


    const [myData, setMyData] = useState({
        name: "",
        description: "",
        country: "",
        league: "",
        attendance: "",
        city: "",
        characteristic: [],
    })

    console.log('Meus dados', myData)

    const GetData = () => {
        AxiosInstance.get(`footballclub/${MyId}/`).then((res) => {
            setMyData(res.data)
        })
    }

    useEffect(() => {
        GetData()
    }, [])

    const DeleteRecord = (event) => {
        event.preventDefault()
        AxiosInstance.delete(`footballclub/${MyId}/`)
            .then(() => {
                setMessage(
                    <MyMessage
                        messageText={'Dados excluídos com sucesso!'}
                        messagecolor={'green'}
                    />
                )
                setTimeout(() => {
                    navigate('/')
                }, 2000)
            })
    }

    return (
        <div>
            <form onSubmit={DeleteRecord}>
                {message}

                <Box className={'TopBar'}>
                    <WarningIcon/>
                    <Typography sx={{ marginLeft: '15px', fontWeight: 'bold' }} variant='subtitle1'>Tem certeza que deseja excluir este registro?</Typography>
                </Box>

                <Box className={'TextBox'}>
                    <Typography>
                        Você excluirá o clube <strong>{myData.name}</strong> de <strong>{myData.city}</strong>, <strong>{myData.country_details.name}</strong>.
                    </Typography>
                </Box>

                <Box sx={{ marginTop: '30px', paddingLeft: '90%' }}>
                    <Button type="submit" variant="contained">Excluir</Button>
                </Box>

            </form>

        </div>
    )
}

export default Delete