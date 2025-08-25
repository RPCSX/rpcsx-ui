import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ExtensionApiGenerator } from "./cpp-generators.js"
import { ProjectGenerator, RpcsxKit } from "./generators.js"

const libProject: ProjectGenerator = {
    name: "libProject",
    projectId: "lib",
};
const rendererProject: ProjectGenerator = {
    name: "rendererProject",
    projectId: "renderer",
};
const serverProject: ProjectGenerator = {
    name: "serverProject",
    projectId: "server",
};

async function cppGenerator(inDir: string, outDir: string, depLibs: string[], name: string) {
    const kit = new RpcsxKit(
        [
            libProject,
            rendererProject,
            serverProject,
        ],
        [],
        [new ExtensionApiGenerator({ outDir, depLibs, libPrefix: name.split("-") })]
    );
    await kit.generate([inDir]);
    await kit.commit();
}

yargs(hideBin(process.argv))
    .strict()
    .command("generate", "generate code for language", (yargs) => {
        return yargs
            .option('lang', {
                alias: 'l',
                type: 'string',
                choices: ["c++"],
                demandOption: true
            })
            .option("input", { type: 'string', normalize: true, description: "Input directory", demandOption: true })
            .option("output", { type: 'string', normalize: true, description: "Output directory", demandOption: true })
            .option("name", { type: 'string', description: "Name of extension", demandOption: true })
            .option("depLibs", { type: 'string', array: true, description: "List of libraries to add as dependencies for generated library" })
    }, (argv) => {
        cppGenerator(argv.input, argv.output, argv.depLibs ?? [], argv.name);
    })
    .parseSync();


