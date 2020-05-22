
// Pokemon Platinum
//By SpaceCats
//Credits to StarSchulz for savestates
//Credits to 6100m (the typer of this) for documenting it 
//Credits to Jasper for debugging our git problems.
/*
Enjoy!
:D :3 <3
*/
import * as Viewer from '../viewer';
import * as NARC from './narc';
import { DataFetcher } from '../DataFetcher';
import ArrayBufferSlice from '../ArrayBufferSlice';
import { GfxDevice, GfxHostAccessPass, GfxRenderPass } from '../gfx/platform/GfxPlatform';
import { MDL0Renderer, G3DPass } from './render';
import { assert, assertExists } from '../util';
import { mat4 } from 'gl-matrix';
import { BasicRenderTarget, depthClearRenderPassDescriptor, opaqueBlackFullClearRenderPassDescriptor } from '../gfx/helpers/RenderTargetHelpers';
import { FakeTextureHolder } from '../TextureHolder';
import { GfxRenderInstManager } from '../gfx/render/GfxRenderer';
import { GfxRenderDynamicUniformBuffer } from '../gfx/render/GfxRenderDynamicUniformBuffer';
import { SceneContext } from '../SceneBase';
import { parseNSBMD, BTX0, parseNSBTX, fx32, TEX0, MDL0Model } from './NNS_G3D';
import { CameraController } from '../Camera';
import { AABB } from '../Geometry';
/*Above, we import AABB into Geometry
Here is everything we have imported so far, the following if you will and whereas in that order and represented therein :D like so :
Viewer
NARC
DataFetcher
ArrayBufferSlice
GfxDevice, GfxHostAccessPass, GfxRenderPass
MDL0Renderer, G3DPass
assert, assertExists
mat4
BasicRenderTarget, depthClearRenderPassDescriptor, opaqueBlackFullClearRenderPassDescriptor
FakeTextureHolder
GfxRenderInstManager
SceneContext
parseNSBMD, BTX0, parseNSBTX, fx32, TEX0, MDL0Model
CameraController
*/
const pathBase = `PokemonPlatinum`;
class ModelCache {
    private filePromiseCache = new Map<string, Promise<ArrayBufferSlice>>();
    public fileDataCache = new Map<string, ArrayBufferSlice>();

    constructor(private dataFetcher: DataFetcher) { //Set a path base and fetch data
    }

    //TODO: Document more of it
    
    
    
    public waitForLoad(): Promise<any> {
        const p: Promise<any>[] = [... this.filePromiseCache.values()];
        return Promise.all(p); //Wait for it to load
    }

    private mountNARC(narc: NARC.NitroFS, root: string): void {
        for (let i = 0; i < narc.files.length; i++) {
            const file = narc.files[i];
            this.fileDataCache.set(`${root}/${i}.bin`, file.buffer);
        }
    } //Mount NARC (a NitroFS file)

    //TODO: Document the above functions more extensively
    
    
    
    private fetchFile(path: string): Promise<ArrayBufferSlice> {
        assert(!this.filePromiseCache.has(path));
        const p = this.dataFetcher.fetchData(`${pathBase}/${path}`);
        this.filePromiseCache.set(path, p);
        return p;
    } //Fetch that pre-fetched data

    public async fetchNARC(path: string, root: string) {
        const fileData = await this.fetchFile(path);
        const narc = NARC.parse(fileData);
        this.mountNARC(narc, root);
    } //Fetch the NARC Archive that we grabbed earlier

    public getFileData(path: string): ArrayBufferSlice | null {
        if (this.fileDataCache.has(path))
            return this.fileDataCache.get(path)!;
        else
            return null;
    }
} //Obtain File path, a string tied to a ArrayBufferSlice type "pseudo-struct".

export class PlatinumMapRenderer implements Viewer.SceneGfx {
    public renderTarget = new BasicRenderTarget();
    public renderInstManager = new GfxRenderInstManager();
    public uniformBuffer: GfxRenderDynamicUniformBuffer;
    public textureHolder: FakeTextureHolder; //Target where we wanna render
    
    
    ///TODO: Be more clear on documentation on render targets
    
    
    

    constructor(device: GfxDevice, public objectRenderers: MDL0Renderer[]) {
        this.uniformBuffer = new GfxRenderDynamicUniformBuffer(device); //Render a uniform buffer

        const viewerTextures: Viewer.Texture[] = [];
        for (let i = 0; i < this.objectRenderers.length; i++) {
            const element = this.objectRenderers[i];
            for (let j = 0; j < element.viewerTextures.length; j++)
                viewerTextures.push(element.viewerTextures[j]); //Push textures, and do some bitwise operation and conditional stuff.
        }
        this.textureHolder = new FakeTextureHolder(viewerTextures); 
        //Above, we create a trojan horse, a fake texture holder that allows us to get this to work properly
    }

    public adjustCameraController(c: CameraController) {
        c.setSceneMoveSpeedMult(10); //Adjust the camera a itty bit, ten to be precise
    }

    public prepareToRender(device: GfxDevice, hostAccessPass: GfxHostAccessPass, viewerInput: Viewer.ViewerRenderInput): void {
        const template = this.renderInstManager.pushTemplateRenderInst();
        template.setUniformBuffer(this.uniformBuffer);
        for (let i = 0; i < this.objectRenderers.length; i++)
            this.objectRenderers[i].prepareToRender(this.renderInstManager, viewerInput);
        this.renderInstManager.popTemplateRenderInst(); //Prepartion for rendering
        
        
        ///TODO: Be more consise on the docs for render prepartion
        
        
        

        this.uniformBuffer.prepareToRender(device, hostAccessPass); //Add that rendering to a uniform buffer through our noclip magic :3
    }

    public render(device: GfxDevice, viewerInput: Viewer.ViewerRenderInput): GfxRenderPass {
        const hostAccessPass = device.createHostAccessPass();
        this.prepareToRender(device, hostAccessPass, viewerInput);
        device.submitPass(hostAccessPass); //Pass it through
        
        
        //TODO: Be more consise on that passthrough
        
        
        

        this.renderTarget.setParameters(device, viewerInput.backbufferWidth, viewerInput.backbufferHeight); //Adjust height and width of that buffer
        
        
        //TODO: Figure out a data structure to label what buffer it is.

        // First, render the skybox.
        const skyboxPassRenderer = this.renderTarget.createRenderPass(device, viewerInput.viewport, opaqueBlackFullClearRenderPassDescriptor);
        this.renderInstManager.setVisibleByFilterKeyExact(G3DPass.SKYBOX);
        this.renderInstManager.drawOnPassRenderer(device, skyboxPassRenderer);
        device.submitPass(skyboxPassRenderer);
        // Now do main pass.
        const mainPassRenderer = this.renderTarget.createRenderPass(device, viewerInput.viewport, depthClearRenderPassDescriptor);
        this.renderInstManager.setVisibleByFilterKeyExact(G3DPass.MAIN);
        this.renderInstManager.drawOnPassRenderer(device, mainPassRenderer);

        this.renderInstManager.resetRenderInsts(); //Flush unneeded gunk

        return mainPassRenderer; //Alrighty, that's a wrap!
    }

    
    //TODO: Analyze the return command a bit more by making a data structure
    
    
    
    public destroy(device: GfxDevice): void {
        this.renderInstManager.destroy(device);
        this.renderTarget.destroy(device);
        this.uniformBuffer.destroy(device);

        this.renderTarget.destroy(device);

        for (let i = 0; i < this.objectRenderers.length; i++)
            this.objectRenderers[i].destroy(device);
    } // Document this, docs for this public function is absent rn.
}

export function checkTEX0Compatible(mdl0: MDL0Model, tex0: TEX0): boolean {
    for (let i = 0; i < mdl0.materials.length; i++)
        if (mdl0.materials[i].textureName !== null && tex0.textures.find((tex) => tex.name === mdl0.materials[i].textureName) === undefined)
            return false;
    return true; //Check if textures are compatibile
}

export function tryMDL0(device: GfxDevice, mdl0: MDL0Model, tex0: TEX0): MDL0Renderer | null {
    if (checkTEX0Compatible(mdl0, tex0))
        return new MDL0Renderer(device, mdl0, tex0);
    else
        return null;
} // If it is compatibile, render that friendly computer (◕‿◕✿)

class PokemonPlatinumSceneDesc implements Viewer.SceneDesc {
    constructor(public id: string, public name: string) {} //Add scene descriptions into the descriptor
    
    //TODO: Be more consise on that descriptor

    public async createScene(device: GfxDevice, context: SceneContext): Promise<Viewer.SceneGfx> {
        const dataFetcher = context.dataFetcher; //create a scene with fetched data, promises, viewers and context
        
        
        //TODO: Reword that to be better.

        const modelCache = new ModelCache(dataFetcher);
        modelCache.fetchNARC(`land_data.narc`, 'land_data');
        modelCache.fetchNARC(`map_tex_set.narc`, 'map_tex_set');
        modelCache.fetchNARC(`build_model.narc`, 'build_model');
        modelCache.fetchNARC(`map_matrix.narc`, 'map_matrix');
        await modelCache.waitForLoad(); //Fetch NitroFS archive (NARC) assets

        //Spacecats: TODO - General cleaning and organization. Fix issues with a few map chunks.

        const tilesets = new Map<number, BTX0>();
        const renderers: MDL0Renderer[] = [];
        const map_matrix_headers: number[][] = [];
        const map_matrix_height: number[][] = [];
        const map_matrix_files: number[][] = [];
        const tileset_indices: number[] = [];
        
        
        //set statics for the matrix
        
        //TODO: Be more consise on docs for matrix statics

        const mapHeaders = (await dataFetcher.fetchData(`${pathBase}/maps.bin`)).createDataView();
        
        const mapHeaderIndex = parseInt(this.id);
        const mapFallbackTileset = mapHeaders.getUint8(mapHeaderIndex*24);
        const matrixIndex = mapHeaders.getUint8(mapHeaderIndex*24 + 0x02);
        console.log(`Reading Map Header at 0x${(mapHeaderIndex*24).toString(16)} : 0x${mapHeaders.getUint8(mapHeaderIndex*24).toString(16)}`)
        console.log(matrixIndex); //Log the map header that we read at the beginning of this function

        for (let i = 0; i < 700; i++) {
            tileset_indices[i] = mapHeaders.getUint8((24 * i)); //Grab the map header's 8 bit value that we just got from that function
            
            
            //TODO: Document a naming for the function I talk about above
        }

        const mapMatrixData = assertExists(modelCache.getFileData(`map_matrix/${matrixIndex}.bin`)).createDataView();
        const width = mapMatrixData.getUint8(0x00);
        const height = mapMatrixData.getUint8(0x01);
        const hasHeightLayer = mapMatrixData.getUint8(0x02) == 1;
        const hasHeaderLayer = mapMatrixData.getUint8(0x03) == 1; //Use that map header's 8 bit value to obtain some matrix data stuff
        
        //TODO: Be more descriptive and specify where
        
        //Read header or file layer and set default height, if the header layer is included this is header, if its not its file
        let currentMatrixOffset = 0x05 + mapMatrixData.getUint8(0x04);
        for (let y = 0; y < height; y++) {
            map_matrix_files[y] = [];
            map_matrix_height[y] = [];
            map_matrix_headers[y] = [];
            for (let x = 0; x < width; x++) {
                const idx = mapMatrixData.getUint16(currentMatrixOffset, true);
                
                map_matrix_height[y][x] = 0;
                map_matrix_files[y][x] = idx;
                map_matrix_headers[y][x] = idx;
                currentMatrixOffset += 2;
            }   
        }
        
        if(hasHeightLayer){
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    map_matrix_height[y][x] = mapMatrixData.getUint8(currentMatrixOffset);
                    currentMatrixOffset += 1; //Do some processing on the height layer
                }   
            }
        }

        //If the header data is included, the file indices will be after the height layer
        if(hasHeaderLayer){
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    map_matrix_files[y][x] = mapMatrixData.getUint16(currentMatrixOffset, true);
                    currentMatrixOffset += 2;
                }   
            }
        }

        //SpaceCats: This is a hack, but it works.
        let set_index = 0;
        while (modelCache.getFileData(`map_tex_set/${set_index}.bin`) !== null){
            tilesets.set(set_index, parseNSBTX(assertExists(modelCache.getFileData(`map_tex_set/${set_index}.bin`))));
            set_index++;
        } //TODO: More reverse engineering on it so we can redo the hack :3

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (map_matrix_files[y][x] === 0xFFFF)
                    continue;

                const mapDataFile = assertExists(modelCache.getFileData(`land_data/${map_matrix_files[y][x]}.bin`));
                const mapData = assertExists(mapDataFile).createDataView(); //Assert whether map matrix binary files/data exists

                const objectOffset = mapData.getUint32(0x00, true) + 0x10;
                const modelOffset = mapData.getUint32(0x04, true) + objectOffset;
                const modelSize = mapData.getUint32(0x08, true); //If it does, let's grab it's 32 bit data!
                
                //TODO: Be a lot more consise on that 32-bit data.

                const embeddedModelBMD = parseNSBMD(mapDataFile.slice(modelOffset, modelOffset + modelSize));
                const tilesetIndex = tileset_indices[map_matrix_headers[y][x]]; //Index tileset

                let mapRenderer: MDL0Renderer | null = null;

                if (mapRenderer === null)
                    mapRenderer = tryMDL0(device, embeddedModelBMD.models[0], assertExists(tilesets.get(tilesetIndex)!.tex0));
                if (mapRenderer === null)
                    mapRenderer = tryMDL0(device, embeddedModelBMD.models[0], assertExists(tilesets.get(mapFallbackTileset)!.tex0));
                if (mapRenderer === null)
                    continue; //do some assertion and conditional statements here and there
                
                
                //TODO: Be more consise on that assertion and conditional statements mentioned three lines above

                mat4.translate(mapRenderer.modelMatrix, mapRenderer.modelMatrix, [(x * 512), map_matrix_height[y][x]*8, (y * 512)]);
                
                //Translate map renderer and model matrix (twice) and then timems it by 512, and do the equation matrix_height * 8 * 512
                
                const bbox = new AABB(-256, -256, -256, 256, 256, 256);
                bbox.transform(bbox, mapRenderer.modelMatrix);
                mapRenderer.bbox = bbox;
                
                //TODO: Document bbox stuff

                renderers.push(mapRenderer); ///Push it to the renderer, nearly there :D

                const objectCount = (modelOffset - objectOffset) / 0x30;
                for (let objIndex = 0; objIndex < objectCount; objIndex++) {
                    const currentObjOffset = objectOffset + (objIndex * 0x30);
                    const modelID = mapData.getUint32(currentObjOffset, true);

                    
                    //get current obj offset, and modelid
                    
                    //TODO: Be more consise on that part.
                    
                    
                    const posX = fx32(mapData.getInt32(currentObjOffset + 0x04, true));
                    const posY = fx32(mapData.getInt32(currentObjOffset + 0x08, true));
                    const posZ = fx32(mapData.getInt32(currentObjOffset + 0x0C, true));

                    //Obtain coordinates on the currentObjOffset by abusing a 32-bit integer value, the basic xyz coords and whatnot....
                    
                    const modelFile = assertExists(modelCache.getFileData(`build_model/${modelID}.bin`));
                    const objBmd = parseNSBMD(modelFile); 
                    
                    //Parse our mortal enemy NSBMD files, https://media.giphy.com/media/ZdrUuSEC0LygaFXtNT/giphy.gif

                    const renderer = new MDL0Renderer(device, objBmd.models[0], assertExists(objBmd.tex0));
                    renderer.bbox = bbox;
                    mat4.translate(renderer.modelMatrix, renderer.modelMatrix, [(posX + (x * 512)), posY, (posZ + (y * 512))]);
                    renderers.push(renderer);
                } //TODO: Document this part more extensively
            }
        }

        return new PlatinumMapRenderer(device, renderers);
    } //TODO: Document this part too
    
}

const id = 'pkmnpl';
const name = 'Pokemon Platinum';
const sceneDescs = [
    new PokemonPlatinumSceneDesc("0", "Sinnoh Region"),
    new PokemonPlatinumSceneDesc("2", "Underground"), //Describe both scenes
]; //TODO: Be more consise on that part.

export const sceneGroup: Viewer.SceneGroup = { id, name, sceneDescs }; //TODO: Document this part as well
