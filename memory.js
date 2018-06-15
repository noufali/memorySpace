let clock;
let container;
let renderer;
let scene;
var camera;
var dollyCam;
var orbitControls;
let controls;
let lastRenderTime;
let light;
let light2;
let spheres = [];
let otherSpheres = [];
let room;
let crosshair;
let x = 1;
let y = 1;
let z = 1;

// intersections
let mouse = new THREE.Vector2(), INTERSECTED;
let INTERSECTED2;
let intersects;
let raycaster = new THREE.Raycaster();
let arrow;
//var z;
let isBallClicked = false;

// VR functionality
let effect;
let vrManager;
let vrDisplay;
let vrButton;
let vrFrame;

// Physics variables
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let physicsWorld;
let dynamicObjects = [];
let transformAux1 = new Ammo.btTransform();
let time = 0;
let cameraSphere;

let frontRefractor;
let leftRefractor;
let rightRefractor;
let bottomRefractor;
let backRefractor;
let topRefractor;

window.addEventListener('load', onLoad);
container = document.getElementById('container');

function onLoad() {
  //loadFiles(data);
  clock = new THREE.Clock();
  let wid = window.innerWidth;
  let hei = window.innerHeight;
  let container = document.getElementById('container');

  // INITIALIZATION
  renderer = new THREE.WebGLRenderer({});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(wid, hei);
  container.appendChild( renderer.domElement );

  effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, wid/hei, 0.1, 1000);

  controls = new THREE.VRControls( camera );
  controls.standing = true;
  controls.update();
  camera.position.y = controls.userHeight;

  dollyCam = new THREE.PerspectiveCamera();
  //dollyCam.position.set(0,20,-50);

  orbitControls = new THREE.OrbitControls(dollyCam);
  dollyCam.add(camera);
  scene.add(dollyCam);

  camera.add( crosshair );
  scene.add(camera);

  arrow = new THREE.ArrowHelper( raycaster.ray.direction, (raycaster.ray.origin), 100, 0xffffff );
  //scene.add( arrow );

  // Initialize (Web)VR
  renderer.vr.enabled = true;
  setupVRStage();

  // EVENTS
  window.addEventListener('resize', onWindowResize, true );
  window.addEventListener('vrdisplaypresentchange', onWindowResize, true);
}

// sets up the VR stage + button
function setupVRStage() {
  // get available displays
  navigator.getVRDisplays().then( function(displays) {
  if(displays.length > 0) {
      vrDisplay = displays[0];
      // VRStageParameters object containing the VRDisplay's room-scale parameters
      if(vrDisplay.stageParameters) {
        setStageDimensions(vrDisplay.stageParameters);
      }
    controls.update();

      // setting up button and onclick function programmed in WEBvr to turn page into VR experience and split screen
      vrButton = WEBVR.getButton( vrDisplay, renderer.domElement );
      document.getElementById('vr_bb').appendChild( vrButton );
  } else {
      console.log("NO VR DISPLAYS PRESENT");
  }
  initPhysics();
    createEnvironment();
  update();
  });
}
//Physics configuration
function initPhysics() {
  collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
  physicsWorld.setGravity( new Ammo.btVector3( 0, 0, 0 ) );
}
// (does nothing for now)
function setStageDimensions(stage){
    ;
}

let boxMesh;

function createEnvironment() {
  // Lights
  scene.add( new THREE.AmbientLight( 0xffffff, 0.3) );
  light = new THREE.DirectionalLight( 0xFAFAFA );
  light.position.set(  - 10, 40,  20 );
  light.castShadow = true;
  light.shadow.camera.zoom = 4;
  scene.add( light );
  light.target.position.set( -6 , 5.5 , 6 );
  scene.add( light.target );

  light2 = new THREE.DirectionalLight( 0xFAFAFA,0.3 );
  light2.position.set( 10, 40, - 20 );
  light2.castShadow = true;
  light2.shadow.camera.zoom = 4;
  //scene.add( light2 );
  light2.target.position.set( 6 , 5.5 , -6 );
  //scene.add( light2.target );
  sky();
  roomWalls();
  glassWalls();
  target();
  memories();
  //song();
}
// PLANE OBJECT
function Plane () {
  this.display = function (material,wid,hei,x,y,z,rotX,rotY) {
    let plane = new THREE.PlaneGeometry( wid, hei, 24 ,24);
    let planeMesh = new THREE.Mesh( plane, material );
    planeMesh.position.set(x,y,z);
    planeMesh.rotateX( rotX );
    planeMesh.rotateY( rotY );

    ground = new Ammo.btStaticPlaneShape( new Ammo.btVector3(0,0,-1),0);

    let mass = 0;
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    ground.calculateLocalInertia( mass, localInertia );
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    let pos = planeMesh.position;
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    let rot = planeMesh.quaternion;
    transform.setRotation(new Ammo.btQuaternion( rot.x , rot.y , rot.z , rot.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, ground, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 0.2 );
    planeMesh.userData.physicsBody = body;
    physicsWorld.addRigidBody( body );

    return planeMesh;

  }
}
// ROOM WALLS
function roomWalls () {
  let transPlane = new THREE.MeshPhongMaterial({
    color: 0x3572B0,
    shininess: 30,
    metal: true,
    wrapAround: true,
    side:THREE.DoubleSide,
    transparent: true,
    opacity: 0.2
  })

  let solidPlane = new THREE.MeshPhongMaterial({
    color: 0x3572B0,
    shininess: 30,
    metal: true,
    wrapAround: true,
    side:THREE.DoubleSide,
  })

  let bottomPlane = new Plane();
  scene.add(bottomPlane.display(solidPlane,12,12, 0,-0.5,0, Math.PI / 2, 0));

  let leftPlane = new Plane();
  scene.add(leftPlane.display(transPlane,12,6,-6,2.5,0, 0, -Math.PI / 2));

  let rightPlane = new Plane();
  scene.add(rightPlane.display(transPlane,12,6,6,2.5,0, 0, Math.PI / 2));

  let frontPlane = new Plane();
  scene.add(frontPlane.display(transPlane,12,6,0,2.5,6, 0, 0));

  let backPlane = new Plane();
  scene.add(backPlane.display(transPlane,12,6,0,2.5,-6, 0, Math.PI));

  let AbovePlane = new Plane();
  scene.add(AbovePlane.display(transPlane,12,12,0,5.5,0, - Math.PI / 2, 0));
}
// TARGET
function target () {
  let targetMaterial = new THREE.LineBasicMaterial({ color: 0xAAFFAA });
  let x = 0.01, y = 0.01;
  let target = new THREE.Geometry();

  // crosshair
  target.vertices.push(new THREE.Vector3(0, y, 0));
  target.vertices.push(new THREE.Vector3(0, -y, 0));
  target.vertices.push(new THREE.Vector3(0, 0, 0));
  target.vertices.push(new THREE.Vector3(x, 0, 0));
  target.vertices.push(new THREE.Vector3(-x, 0, 0));

  crosshair = new THREE.Line( target, targetMaterial );

  // place it in the center

  let crosshairPercentX = 50;
  let crosshairPercentY = 50;
  let crosshairPositionX = (crosshairPercentX / 100) * 2 - 1;
  let crosshairPositionY = (crosshairPercentY / 100) * 2 - 1;

  crosshair.position.x = crosshairPositionX * camera.aspect;
  crosshair.position.y = crosshairPositionY;

  crosshair.position.z = -0.3;
  camera.add( crosshair );
}
//SKYDOME
function sky() {
  let loader = new THREE.TextureLoader();
  let skyGeo = new THREE.SphereGeometry(500, 25, 25);
  let skyMat = new THREE.MeshPhongMaterial({
    map: loader.load("media/eso0932a_sphere_min.jpg"),
  });
  let skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.material.side = THREE.BackSide;
  scene.add(skyDome);
}
//GLASS WALLS
function glassWalls(){
  frontRefractor = new THREE.Refractor( 10, 6, {
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: THREE.WaterRefractionShader
  } );
  frontRefractor.position.set( 0,2.5,-5 );
  scene.add( frontRefractor );

  leftRefractor = new THREE.Refractor( 10, 6, {
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: THREE.WaterRefractionShader

  } );
  leftRefractor.position.set( -5,2.5,0 );
  leftRefractor.rotateY(Math.PI / 2);
  scene.add( leftRefractor );

  rightRefractor = new THREE.Refractor( 10, 6, {
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: THREE.WaterRefractionShader
  } );
  rightRefractor.position.set( 5,2.5,0 );
  rightRefractor.rotateY(- Math.PI / 2);
  scene.add( rightRefractor );

  bottomRefractor = new THREE.Refractor( 12, 12, {
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: THREE.WaterRefractionShader
  } );
  bottomRefractor.position.set( 0,0,0 );
  bottomRefractor.rotateX( - Math.PI / 2 );
  scene.add( bottomRefractor );

  backRefractor = new THREE.Refractor( 10, 6, {
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: THREE.WaterRefractionShader
  } );
  backRefractor.position.set( 0,2.5,5 );
  backRefractor.rotateY(  Math.PI );
  scene.add( backRefractor );

  topRefractor = new THREE.Refractor( 12, 12, {
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: THREE.WaterRefractionShader
  } );
  topRefractor.position.set( 0,4.5,0 );
  topRefractor.rotateX( Math.PI / 2 );
  scene.add( topRefractor );

  var dudvMap = new THREE.TextureLoader().load( 'pic/waterdudv.jpg', function () {
    update();
  } );
  dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;

  frontRefractor.material.uniforms.tDudv.value = dudvMap;
  leftRefractor.material.uniforms.tDudv.value = dudvMap;
  rightRefractor.material.uniforms.tDudv.value = dudvMap;
  bottomRefractor.material.uniforms.tDudv.value = dudvMap;
  backRefractor.material.uniforms.tDudv.value = dudvMap;
  topRefractor.material.uniforms.tDudv.value = dudvMap;
}
//MEMORY SPHERES
function memories(){
  var geometry2 = new THREE.SphereGeometry( 0.5, 24, 24 );

  for ( let i = 0; i < 30; i ++ ) {
    let objectSize = 3;
    let margin = 0.05;
    let num = THREE.Math.randInt(0,4);
    let texture = new THREE.TextureLoader().load( data[num].image );
    texture.format = THREE.RGBFormat;
    let materialBack = new THREE.MeshBasicMaterial({
        map: texture,
        side:THREE.BackSide
    });

    let materialFront = new THREE.MeshStandardMaterial({
        color: 0x3572B0,
        shininess: 30,
        metal: true,
        side:THREE.FrontSide
    });

    let materials = [materialFront,materialBack];
    let object = THREE.SceneUtils.createMultiMaterialObject( geometry2, materials );
    object.position.set(THREE.Math.randInt(-3,3),THREE.Math.randInt(-2,3),THREE.Math.randInt(-3,0));

    // APPLYING RIGID BODIES
    let shape = new Ammo.btSphereShape( 0.5 );
    shape.setMargin( margin );
    let mass = 0.5 * 2;
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    shape.calculateLocalInertia( mass, localInertia );
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    let pos = object.position;
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    //body.setAngularVelocity( new Ammo.btVector3(1,1,1));
    body.setFriction( 200 );
    object.userData.physicsBody = body;
    object.receiveShadow = true;
    object.castShadow = true;

    object.children[0].userData.sister = i;
    object.children[1].userData.sister = i;

    scene.add( object );
    dynamicObjects.push( object );
    physicsWorld.addRigidBody( body );

    spheres.push(object.children[0]);
    spheres.push(object.children[1]);
  }

  //CAMERA SPHERE
  var origin = new THREE.SphereGeometry( 0.5, 24, 24 );
  let objectSize = 3;
  let margin = 10;
  let material = new THREE.MeshPhongMaterial( {
    color: 0xdddddd, specular: 0x009900, shininess: 30, flatShading: true, visible: false
  } )
  cameraSphere = new THREE.Mesh( origin, material );
  cameraSphere.position.x = camera.position.x;
  cameraSphere.position.y = camera.position.y;
  cameraSphere.position.z = camera.position.z;
  // mesh.visible = false;

  // APPLYING RIGID BODIES
  let shape = new Ammo.btSphereShape( 0.6 );
  shape.setMargin( margin );

  let mass = 0;
  let localInertia = new Ammo.btVector3( 0, 0, 0 );
  shape.calculateLocalInertia( mass, localInertia );
  let transform = new Ammo.btTransform();
  transform.setIdentity();
  let pos = cameraSphere.position;
  transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
  let motionState = new Ammo.btDefaultMotionState( transform );
  let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );
  let body = new Ammo.btRigidBody( rbInfo );
  body.setFriction( 200 );
  cameraSphere.userData.physicsBody = body;

  scene.add( cameraSphere );
  dynamicObjects.push( cameraSphere );
  physicsWorld.addRigidBody( body );
}

// function song() {
//   var audioListener = new THREE.AudioListener();
//   var mainSong = new THREE.Audio( audioListener );
//   camera.add( audioListener );
//   scene.add( mainSong );
//
//   var loader = new THREE.AudioLoader();
//   loader.load('song/Rain.mp3',
//     function ( audioBuffer ) {
//       mainSong.setBuffer( audioBuffer );
//       mainSong.play();
//     },
//     function ( xhr ) {
//       console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
//     },
//     function ( xhr ) {
//       console.log( 'An error happened' );
//     });
// }
window.addEventListener( 'vr controller connected', function( event ){
  //  Here it is, your VR controller instance.
  //  It’s really a THREE.Object3D so you can just add it to your scene:
  var controller = event.detail
  scene.add( controller )
  //  HEY HEY HEY! This is important. You need to make sure you do this.
  //  For standing experiences (not seated) we need to set the standingMatrix
  //  otherwise you’ll wonder why your controller appears on the floor
  //  instead of in your hands! And for seated experiences this will have no
  //  effect, so safe to do either way:
  controller.standingMatrix = renderer.vr.getStandingMatrix()
  //  And for 3DOF (seated) controllers you need to set the controller.head
  //  to reference your camera. That way we can make an educated guess where
  //  your hand ought to appear based on the camera’s rotation.
  controller.head = window.camera
  //  Right now your controller has no visual.
  //  It’s just an empty THREE.Object3D.
  //  Let’s fix that!
  var
  meshColorOff = 0xDB3236,//  Red.
  meshColorOn  = 0xF4C20D,//  Yellow.
  controllerMaterial = new THREE.MeshStandardMaterial({
    color: meshColorOff
  }),
  controllerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry( 0.005, 0.05, 0.1, 6 ),
    controllerMaterial
  ),
  handleMesh = new THREE.Mesh(
    new THREE.BoxGeometry( 0.03, 0.1, 0.03 ),
    controllerMaterial
  )
  controllerMaterial.flatShading = true
  controllerMesh.rotation.x = -Math.PI / 2
  handleMesh.position.y = -0.05
  controllerMesh.add( handleMesh )
  controller.userData.mesh = controllerMesh//  So we can change the color later.
  controller.add( controllerMesh )

  //  Button events. How easy is this?!
  //  We’ll just use the “primary” button -- whatever that might be ;)
  //  Check out the THREE.VRController.supported{} object to see
  //  all the named buttons we’ve already mapped for you!
  controller.addEventListener( 'primary press began', function( event ){
    event.target.userData.mesh.material.color.setHex( meshColorOn )
    //guiInputHelper.pressed( true );
    console.log("controller is pressed");

    // check if you're clicking a ball
    if(intersects.length > 0){
      INTERSECTED = intersects[ 0 ].object;
      if(isBallClicked){	// if a ball IS attached, SEND TO BACK
        camera.remove(INTERSECTED);
        scene.add(INTERSECTED);

        INTERSECTED.position.x = Math.random() * 4 - 2;
        INTERSECTED.position.y = Math.random() * 4 - 2;
        INTERSECTED.position.z = Math.random() * 4 - 2;

        // let PercentX = 50;
        // let PercentY = 50;
        // let PositionX = (PercentX / 100) * 2 - 1;
        // let PositionY = (PercentY / 100) * 2 - 1;

        // INTERSECTED.position.x = PositionX * camera.aspect;
        // INTERSECTED.position.y = PositionY;

        // INTERSECTED.position.z = Math.random() * 4;
        // INTERSECTED.rotation.y = Math.random() * Math.PI;
      } else if(!isBallClicked) { // if there are no attached balls, ATTACH IT
        INTERSECTED = intersects[ 0 ].object;
        //INTERSECTED.remove(INTERSECTED.userData.physicsBody);
        scene.remove(INTERSECTED);
        camera.add(INTERSECTED);

        let PercentX = 50;
        let PercentY = 50;
        let PositionX = (PercentX / 100) * 2 - 1;
        let PositionY = (PercentY / 100) * 2 - 1;

        INTERSECTED.position.x = PositionX * camera.aspect;
        INTERSECTED.position.y = PositionY;

        INTERSECTED.position.z = -1;
        //INTERSECTED.rotation.y += 0.01;
      }
      isBallClicked = !isBallClicked;
    }
  })
  controller.addEventListener( 'primary press ended', function( event ){
    event.target.userData.mesh.material.color.setHex( meshColorOff )
    console.log("controller has ended");
  })

  //  Daddy, what happens when we die?
  controller.addEventListener( 'disconnected', function( event ){
    controller.parent.remove( controller )
  })})

function onWindowResize(){
let wid = window.innerWidth;
  let hei = window.innerHeight;
  effect.setSize(wid, hei);
  renderer.setSize(wid, hei);
camera.aspect = wid/hei;
  camera.updateProjectionMatrix();
  console.log("UPDATE SIZE");
}
function onMouseMove( event ) {
mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}
function update(){
  window.requestAnimationFrame(animate);
}

let fps = 30;

function animate(timestamp) {
  var deltaTime = clock.getDelta();
  frontRefractor.material.uniforms.time.value += deltaTime;
  leftRefractor.material.uniforms.time.value += deltaTime;
  rightRefractor.material.uniforms.time.value += deltaTime;
  bottomRefractor.material.uniforms.time.value += deltaTime;
  backRefractor.material.uniforms.time.value += deltaTime;
  topRefractor.material.uniforms.time.value += deltaTime;

  arrow.setDirection(raycaster.ray.direction);

  // update the raycaster
  raycaster.set(camera.getWorldPosition(), camera.getWorldDirection());

  // intersect with all scene meshes.
  intersects = raycaster.intersectObjects(spheres);

  if ( intersects.length > 0) {
    // Ball highlighting
    if ( INTERSECTED != intersects[ 0 ].object & isBallClicked == false ) {
      INTERSECTED = intersects[ 0 ].object;
      let sisterKey = INTERSECTED.userData.sister;
      for (let i=0;i<spheres.length;i++){
        if (spheres[i] != INTERSECTED & spheres[i].userData.sister == sisterKey){
          INTERSECTED2 = spheres[i];
        }
      }
      INTERSECTED.scale.set(1.3, 1.3, 1.3);
      INTERSECTED2.scale.set(1.3, 1.3, 1.3);
    }
  } else {
    for(let i=0;i<spheres.length;i++){
      spheres[i].scale.set(1, 1, 1);
    }
    INTERSECTED = null;
    INTERSECTED2 = null;
  }

  cameraSphere.position.x = camera.position.x;
  cameraSphere.position.y = camera.position.y;
  cameraSphere.position.z = camera.position.z;
  updatePhysics( deltaTime );

  if(vrDisplay.isPresenting) {
    setTimeout(function(){
        controls.update();
        orbitControls.update();
        THREE.VRController.update();
        effect.render(scene, camera);
        vrDisplay.requestAnimationFrame(animate);
    },1000 / fps);
  } else {
    controls.update();
    orbitControls.update();
      renderer.render(scene, camera);
      window.requestAnimationFrame(animate);
  }
  //time += deltaTime;
}

function updatePhysics( deltaTime ) {
  physicsWorld.stepSimulation( deltaTime, 10 );

  // Update objects
  for ( let i = 0, il = dynamicObjects.length; i < il; i++ ) {
    if(dynamicObjects[i].type == "Mesh") {
      cameraSphere.position.x = camera.position.x;
      cameraSphere.position.y = camera.position.y;
      cameraSphere.position.z = camera.position.z;
      let staticSphere = dynamicObjects[ i ];
      let staticPhys = staticSphere.userData.physicsBody;
      let pos = cameraSphere.position;
      // transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
      let rot = cameraSphere.quaternion;
      // transform.setRotation(new Ammo.btQuaternion( rot.x , rot.y , rot.z , rot.w ) );
      let ms = staticPhys.getMotionState();
      if ( ms ) {
        ms.getWorldTransform( transformAux1 );
        //let p = transformAux1.getOrigin();
        let p = transformAux1.setOrigin(new Ammo.btVector3( pos.x, pos.y, pos.z ));
        //let p = new Ammo.btVector3( pos.x, pos.y, pos.z );
        //let q = new Ammo.btQuaternion( rot.x , rot.y , rot.z , rot.w );
        let q = transformAux1.getRotation();
        staticSphere.position.set( pos.x, pos.y, pos.z  );
        //staticSphere.position.set( p.x(), p.y(), p.z() );
      }
    } else {
        let objThree = dynamicObjects[ i ];
        let vec = new Ammo.btVector3(1,1,1);
        objThree.userData.physicsBody.setAngularVelocity( vec );
        var objPhys = objThree.userData.physicsBody;
        var ms = objPhys.getMotionState();
        if ( ms ) {
          ms.getWorldTransform( transformAux1 );
          let p = transformAux1.getOrigin();
          let q = transformAux1.getRotation();
          objThree.position.set( p.x(), p.y(), p.z() );
      }
    }
  }
}
window.addEventListener('mousemove', onMouseMove, false );
window.addEventListener("click", function(){
  console.log("I am pressed");
  if(isBallClicked){	// if a ball IS attached, SEND TO BACK
    let material = new THREE.MeshPhongMaterial( {
      color: 0xdddddd, specular: 0x009900, shininess: 30, flatShading: true, visible: false
    })
    cameraSphere.material = material;

  } else if(!isBallClicked) {
      if(intersects.length > 0) {
        INTERSECTED = intersects[ 0 ].object;
        let sisterKey = INTERSECTED.userData.sister;
        for (let i=0;i<spheres.length;i++){
          if (spheres[i] != INTERSECTED & spheres[i].userData.sister == sisterKey){
            INTERSECTED2 = spheres[i];
          }
        }
      }
      let material = INTERSECTED2.material;
      if (material) {
        console.log(material);
        cameraSphere.material = material;
      }
   }
  isBallClicked = !isBallClicked;
});
