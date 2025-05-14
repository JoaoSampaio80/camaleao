import {React, useState, useEffect} from "react";
import AxiosInstance from "./Axios";
import {Box, Typography} from '@mui/material'
import AddBoxIcon from '@mui/icons-material/AddBox';
import TextForm from "./forms/TextForm";
import SelectForm from "./forms/SelectForm";
import MultiSelectForm from "./forms/MultiSelectForm";
import DescriptionForm from "./forms/DescriptionForm";
import Button from '@mui/material/Button';

const Create = () => {
    const [country, setCountry] = useState([])
    const [league, setLeague] = useState([])
    const [characteristic, setCharacteristic] = useState([])


    console.log("Country", country)
    console.log("League", league)
    console.log("Characteristic", characteristic)


    const GetData = () => {
        AxiosInstance.get('country/').then((res) => {
            setCountry(res.data)
        })

        AxiosInstance.get('league/').then((res) => {
            setLeague(res.data)
        })

        AxiosInstance.get('characteristic/').then((res) => {
            setCharacteristic(res.data)
        })
    }

    useEffect(() => {
        GetData()
    }, [])

    return(
        <div>
            <Box className={'TopBar'}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft:'15px', fontWeight:'bold'}} variant='subtitle1'>Create a new club!</Typography>
            </Box>

            <Box className={'FormBox'}>
                <Box className={'FormArea'}>
                    <TextForm
                        label={"Club name"}
                    />
                </Box>

                <Box className={'FormArea'}>
                     <TextForm
                        label={"City"}
                    />
                </Box>

                <Box className={'FormArea'}>
                    <SelectForm
                        label ={"League"}
                        options={league}
                    />
                </Box>

                <Box className={'FormArea'}>
                    <SelectForm
                        label ={"Country"}
                        options={country}
                    />
                </Box>

                 <Box className={'FormArea'}>
                    <MultiSelectForm
                        label ={"Characteristics"}
                        options={characteristic}
                    />
                </Box>

                 <Box className={'FormArea'}>
                    <DescriptionForm
                        label ={"Description"}
                        rows = {9}                        
                    />
                </Box>

                <Box sx={{marginTop:'30px', paddingLeft:'90%'}}>
                    <Button variant="contained">Salvar</Button>
                </Box>
                
            </Box>
        </div>
    )
}

export default Create