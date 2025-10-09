const mongoose = require('mongoose');
require('dotenv').config();

// JobType Schema
const jobTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
});

const JobType = mongoose.model('JobType', jobTypeSchema);

// Initial job types
const initialJobTypes = [
  { name: 'Custom Exhibition Large', description: 'Large custom exhibition projects' },
  { name: 'Custom Exhibition Medium', description: 'Medium custom exhibition projects' },
  { name: 'Custom Exhibition Small', description: 'Small custom exhibition projects' },
  { name: 'Exhibition Hire Large', description: 'Large exhibition hire projects' },
  { name: 'Exhibition Hire Medium', description: 'Medium exhibition hire projects' },
  { name: 'Exhibition Hire Small', description: 'Small exhibition hire projects' },
  { name: 'Museum Large', description: 'Large museum projects' },
  { name: 'Museum Medium', description: 'Medium museum projects' },
  { name: 'Museum Small', description: 'Small museum projects' },
  { name: 'Re-install', description: 'Re-installation projects' },
  { name: 'Product', description: 'Product-related projects' }
];

async function seedJobTypes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/capacity-planner');
    console.log('Connected to MongoDB');

    // Clear existing job types
    await JobType.deleteMany({});
    console.log('Cleared existing job types');

    // Insert initial job types
    const result = await JobType.insertMany(initialJobTypes);
    console.log(`Successfully seeded ${result.length} job types:`);
    
    result.forEach(jobType => {
      console.log(`- ${jobType.name}`);
    });

    console.log('\nJob types seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding job types:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedJobTypes();
