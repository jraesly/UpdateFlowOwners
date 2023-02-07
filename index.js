const axios = require("axios");
const core = require('@actions/core');

async function generateBearerToken(clientId, clientSecret, tenantId, environmentId) {
    const response = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&scope=https://api.crm.dynamics.com/${environmentId}`);
    console.log("Bearer token Acquired");
    return response.data.access_token;
}
async function getBearerToken(clientId, clientSecret, tenantId) {
    try {
        const response = await axios.post(
            `https://login.microsoftonline.us/${tenantId}/oauth2/token`,
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=https://api.dynamics.com`,
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
    const flows = await axios.get(`${orgUrl}/api/data/v9.1/workflows`, {
        headers: {
            Authorization: `Bearer ${bearerToken}`,
        },
    });
    console.log(`Flows Retrieved. Count: ${flows.Count}`);
    flows.data.forEach(async flow => {
        const ownerId = `systemusers(${ownerId})`;

        await axios.patch(`${orgUrl}/api/data/v9.1/workflows(${flow.workflowid})`, {
            ownerid: ownerId,
        }, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                'OData-Version': '4.0',
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-EntityId': `workflows(${flow.workflowid})`,
            },
        });
    });
}

async function main(clientId, clientSecret, tenantId, orgUrl, environmentId) {
    console.log("Entering main...")
    clientId = core.getInput('clientId', { required: true });
    clientSecret = core.getInput('clientSecret', { required: true });
    tenantId = core.getInput('tenantId', { required: true });
    orgUrl = core.getInput('orgUrl', { required: true });
    environmentId = core.getInput('environmentId', { required: true });
    ownerId = core.getInput('ownerId', { required: true });
    console.log("Grabbed Variables Successfully");
    try {
        const bearerToken = await getBearerToken(clientId, clientSecret, tenantId);
        updateFlowOwners(bearerToken, orgUrl, ownerId);
        console.log(`Flows Updated Successfully`);
        console.log("Exiting....")
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

// Call the main function to run the action
main();

