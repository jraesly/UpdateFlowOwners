const axios = require("axios");
const core = require('@actions/core');
let i = 1;

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

async function updateFlowOwners(bearerToken, orgUrl, ownerId, system) {
    const flows = await axios.get(`${orgUrl}/api/data/v9.1/workflows?$filter=category eq 5 and _ownerid_value ne ${ownerId} and _ownerid_value ne ${system}`, {
        headers: {
            Authorization: `Bearer ${bearerToken}`,
        },
    });
    console.log(`Flows Retrieved. Count: ${flows.data.value.length}`);

    async function updateFlow(flow) {
        console.log(`updating flow now: ${i}`);
        try {
            await axios.patch(`${orgUrl}/api/data/v9.1/workflows(${flow.workflowid})`,
                {
                    //"description": "This flow will ensure consistency across systems.",
                    //"statecode": 1,
                    "ownerid@odata.bind": `systemusers(${ownerId})`
                },
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                        'Accept': 'application/json',
                        'OData-Version': '4.0',
                        'Content-Type': 'application/json',
                        'OData-MaxVersion': '4.0'
                    }
                }
            );
        } 
        catch (error) 
        {
            // this is the main part. Use the response property from the error object
            console.log(flow.name + ': ' + error.response.data.error.message); 
            console.log('Please update ' + flow.name + ' connection references as this is the usual culprit')
        }
        i++;
        if (i < flows.data.value.length) 
        {
            console.log('Waiting one second to avoid Too Many Requests Error')
            setTimeout(() => updateFlow(flows.data.value[i]), 1000);
        } else 
        {
            console.log(`Flows Updated Successfully`);
            console.log("Exiting....");
        }
    }
    updateFlow(flows.data.value[i]);
}


async function main() {
    console.log("Entering main...")
    var clientId =  core.getInput('clientId', { required: true });
    var clientSecret = core.getInput('clientSecret', { required: true });
    var tenantId = core.getInput('tenantId', { required: true });
    var orgUrl = core.getInput('orgUrl', { required: true });
    var ownerId = core.getInput('ownerId', { required: true });
    var system = core.getInput('system', { required: true });

    console.log("Grabbed Variables Successfully");
    try {
        const bearerToken = await getBearerToken(clientId, clientSecret, tenantId, orgUrl);
        console.log(`Entering Flow Updates`);
        updateFlowOwners(bearerToken, orgUrl, ownerId, system);
    }
    catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

// Call the main function to run the action
main();

