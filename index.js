const axios = require("axios");
const core = require('@actions/core');

async function generateBearerToken(clientId, clientSecret, tenantId, environmentId, orgUrl) {
    const response = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&scope=https://api.crm.dynamics.com/${environmentId}`);
    console.log("Bearer token Acquired");
    return response.data.access_token;
}
async function getBearerToken(clientId, clientSecret, tenantId, orgUrl) {
    try {
        const response = await axios.post(
            `https://login.microsoftonline.com/${tenantId}/oauth2/token`,
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=${orgUrl}`,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        console.log("Bearer token Acquired");
        return response.data.access_token;
    } catch (error) {
        console.error(error);
    }
}
async function updateFlowOwners(bearerToken, orgUrl, ownerId) {
    const flows = await axios.get(`${orgUrl}/api/data/v9.1/workflows?$filter=category eq 5 and category eq 5 and _ownerid_value ne ${ownerId}`, {
        headers: {
            Authorization: `Bearer ${bearerToken}`,
        },
    });
    console.log(flows);
    console.log(`Flows Retrieved. Count: ${flows.data.value.length}`);

    
    flows.data.value.forEach( function (flow, count) {
        setTimeout(() => {
        var count = 1;
        console.log(`updating flow now: ${count}`);
        axios.patch(`${orgUrl}/api/data/v9.1/workflows(${flow.workflowid})`,
            {
                "description": "This flow will ensure consistency across systems.",
                "statecode": 1,
                "ownerid@odata.bind": `systemusers(${ownerId})`
            },
            {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                    'Accept': 'application/json',
                    'OData-Version': '4.0',
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0'
                },
            })
            .catch(function (error) {
                if (error.response) {
                    // Request made and server responded
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                } else if (error.request) {
                    // The request was made but no response was received
                    console.log(error.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.log('Error', error.message);
                }

            });
        count++;
        }, count * 1000)
    });
    console.log(`Flows Updated Successfully`);
    console.log("Exiting....")
}

async function main(/*clientId, clientSecret, tenantId, orgUrl, environmentId*/) {
    console.log("Entering main...")
    clientId = //core.getInput('clientId', { required: true });
    clientSecret = //core.getInput('clientSecret', { required: true });
    tenantId =  //core.getInput('tenantId', { required: true });
    orgUrl = //core.getInput('orgUrl', { required: true });
    environmentId = //INT"8098603c-68a4-47f5-ba13-6ddb840b8589";//"0bc156d3-bd12-4b08-a73c-cdb5b7a81a28"; build //core.getInput('environmentId', { required: true });
    ownerId = //core.getInput('ownerId', { required: true });

    console.log("Grabbed Variables Successfully");
    try {
        const bearerToken = await getBearerToken(clientId, clientSecret, tenantId, orgUrl);
        console.log(`Entering Flow Updates`);
        updateFlowOwners(bearerToken, orgUrl, ownerId);
    }
    catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

// Call the main function to run the action
main();

