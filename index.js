const axios = require("axios");
const core = require('@actions/core');
let i = 0;

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
    console.log(`Flows Retrieved. Count: ${flows.data.value.length}`);

    async function updateFlow(flow) {
        console.log(`updating flow now: ${i}`);
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
                },
            });
        i++;
        if (i < flows.data.value.length) {
            setTimeout(() => updateFlow(flows.data.value[i]), 1000);
        } else {
            console.log(`Flows Updated Successfully`);
            console.log("Exiting....");
        }
    }

    updateFlow(flows.data.value[i]);
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

