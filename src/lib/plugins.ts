import { BetterAuthPlugin } from "better-auth/plugins"

export const userMetadata = ()=>{
    return {
        id: "user-metadata",
        schema: {
            user: {
                fields: {
                    dob: {
                        type: "string",
                    },
                },
            },
        },
    } satisfies BetterAuthPlugin
}
