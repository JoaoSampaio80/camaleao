import {React, useState, useEffect} from "react";
import AxiosInstance from "./Axios";
import {Box, Typography} from '@mui/material'
import AddBoxIcon from '@mui/icons-material/AddBox';
import TextForm from "./forms/TextForm";
import SelectForm from "./forms/SelectForm";
import MultiSelectForm from "./forms/MultiSelectForm";
import DescriptionForm from "./forms/DescriptionForm";
import Button from '@mui/material/Button';
import {useFormik} from 'formik';
import * as yup from 'yup';
import MyMessage from "./forms/Message";
import {useNavigate} from 'react-router';

const Create = () => {
    const [country, setCountry] = useState([])
    const [league, setLeague] = useState([])
    const [characteristic, setCharacteristic] = useState([])
    const [message, setMessage] = useState([])
    const navigate = useNavigate

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

    const validationSchema = yup.object({
        name: yup
            .string("O nome deve ser texto")
            .required("O campo nome deve ser preenchido"),
        attendance: yup
            .number("Comparecimento deve ser número")
            .required("Comparecimento deve ser preenchido"),
        characteristic: yup
            .array()
            .min(1, "selecione pelo menos uma opção"),
        description: yup
            .string("A descrição deve ser texto")
            .required("A descrição deve ser preenchida"),


    })

    const formik = useFormik({
        initialValues:{
            name: "",
            description: "",
            country: "",
            league: "",
            attendance: "",
            city: "",
            characteristic: []
        },

        validationSchema: validationSchema,

        onSubmit: (values) => {
            AxiosInstance.post('footballclub/', values).then(() => {                
                setMessage(
                    <MyMessage
                        messageText={'Dados salvos com sucesso'}
                        messagecolor={'green'}
                    />
                )
                setTimeout(() => {
                    navigate('/')
                }, 3000)
            })
        }
    })

    console.log("Form values", formik.values)

    return(
        <div>
            <form onSubmit={formik.handleSubmit}>
            <Box className={'TopBar'}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft:'15px', fontWeight:'bold'}} variant='subtitle1'>Create a new club!</Typography>
            </Box>

            {/* <MyMessage
                messageText={'Dados salvos com sucesso'}
                messagecolor={'green'}
            /> */}

            <Box className={'FormBox'}>
                <Box className={'FormArea'}>
                    <TextForm
                        label={"Club name"}
                        name='name'
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error = {formik.touched.name && Boolean(formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                    />
                </Box>

                <Box className={'FormArea'}>
                     <TextForm
                        label={"City"}
                        name='city'
                        value={formik.values.city}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error = {formik.touched.city && Boolean(formik.errors.city)}
                        helperText={formik.touched.city && formik.errors.city}
                    />
                </Box>

                <Box className={'FormArea'}>
                    <SelectForm
                        label ={"League"}
                        options={league}
                        name='league'
                        value={formik.values.league}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error = {formik.touched.league && Boolean(formik.errors.league)}
                        helperText={formik.touched.league && formik.errors.league}
                    />
                </Box>

                <Box className={'FormArea'}>
                    <SelectForm
                        label ={"Country"}
                        options={country}
                        name='country'
                        value={formik.values.country}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error = {formik.touched.country && Boolean(formik.errors.country)}
                        helperText={formik.touched.country && formik.errors.country}
                    />
                </Box>

                <Box className={'FormArea'}>
                     <TextForm
                        label={"Attendance"}
                        name='attendance'
                        value={formik.values.attendance}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error = {formik.touched.attendance && Boolean(formik.errors.attendance)}
                        helperText={formik.touched.attendance && formik.errors.attendance}
                    />
                </Box>

                 <Box className={'FormArea'}>
                    <MultiSelectForm
                        label ={"Characteristics"}
                        options={characteristic}
                        name='characteristic'
                        value={formik.values.characteristic}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error = {formik.touched.characteristic && Boolean(formik.errors.characteristic)}
                        helperText={formik.touched.characteristic && formik.errors.characteristic}
                    />
                </Box>

                 <Box className={'FormArea'}>
                    <DescriptionForm
                        label ={"Description"}
                        rows = {9}
                        name='description'
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error = {formik.touched.description && Boolean(formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description}                        
                    />
                </Box>

                <Box sx={{marginTop:'30px', paddingLeft:'90%'}}>
                    <Button type="submit" variant="contained">Salvar</Button>
                </Box>
                
            </Box>
            </form>
        </div>
    )
}

export default Create