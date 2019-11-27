import { GET_USERS, RECEIVE_MESSAGE, REMOVE_MESSAGE } from "./types";
import baseURL from "../../baseURL";

export const getUsers = () => async (dispatch, getState, api) => {
    const { data: users } = await api.get("/users");
    dispatch({
        type: GET_USERS,
        payload: users,
    });
};
// TASK 1: connection and getting data through SSE
export const startCommunication = () => async (dispatch, getState, api) => {
    const eventSource = new EventSource(baseURL + '/communication');
    eventSource.onmessage = (e) => {
        console.log(e);
        const { type, data } = JSON.parse(e.data);
        switch(type) {
            case 'users': {
                dispatch({
                    type: GET_USERS, 
                    payload: data
                });
                break;
            }
            case 'message': {
                dispatch({
                    type: RECEIVE_MESSAGE, 
                    payload: data
                });
                setTimeout(() => {
                    dispatch({
                        type: REMOVE_MESSAGE,
                        payload: data.id
                    });
                }, data.expiresIn);
                break;
            }
            default: {
                return;
            }
        }
    }
};

export const sendMessage = data => async (dispatch, getState, api) => {
    await api.post("/send-message", data);
};
