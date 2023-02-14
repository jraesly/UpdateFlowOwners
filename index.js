const axios = require("axios");
const core = require('@actions/core');

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
async function updateFlowOwners(bearerToken, orgUrl, ownerId, category) {
    const flows = await axios.get(`${orgUrl}/api/data/v9.1/workflows?$filter=category eq ${category} and _ownerid_value ne ${ownerId}`, {
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
 //               "description": "This flow will ensure consistency across systems.",
//                "statecode": 1,
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

async function main() {
    console.log("Entering main...")
    var clientId = core.getInput('clientId', { required: true });
    var clientSecret = core.getInput('clientSecret', { required: true });
    var tenantId =  core.getInput('tenantId', { required: true });
    var orgUrl = core.getInput('orgUrl', { required: true });
    var ownerId = core.getInput('ownerId', { required: true });
    var category = core.getInput('category', { required: true });

    console.log("Grabbed Variables Successfully");
    try {
        const bearerToken = await getBearerToken(clientId, clientSecret, tenantId, orgUrl);
        console.log(`Entering Flow Updates`);
        updateFlowOwners(bearerToken, orgUrl, ownerId, category);
    }
    catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

// Call the main function to run the action
main();

