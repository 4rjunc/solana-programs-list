import * as borsh from '@coral-xyz/borsh';
import BN from 'bn.js';

const equipPlayerSchema = borsh.struct([
  borsh.u8('variant'),
  borsh.u16('playerId'),
  borsh.u256('itemId')  // This expects a BN instance
]);
console.log("equipPlayerSchema:", equipPlayerSchema);

// takes an object as argument, object which's data needs to be serialized and a buffer.
// allocate a new buffer that's larger than needed, encode the data into that buffer 
const buffer = Buffer.alloc(1000);

const itemId = new BN('76548');  // Create a BN instance for the itemId
// `encode` method will be used to encode data using schema
equipPlayerSchema.encode(
  {
    variant: 2,
    playerId: 1435,
    itemId: itemId  // Pass the BN instance
  },
  buffer
);

// and slice the original buffer down into a new buffer that's only as large as needed. 
const instructionBuffer = buffer.slice(0, equipPlayerSchema.getSpan(buffer));
console.log("instructionBuffer: ", instructionBuffer);
