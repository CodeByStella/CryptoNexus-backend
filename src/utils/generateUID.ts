import User from '../models/User';

const generateUID = async (): Promise<number> => {
  while (true) {
    const uid = Math.floor(100000 + Math.random() * 900000);

    const existingUser = await User.findOne({ uid });

    if (!existingUser) {
      return uid; 
    }
  }
};

export default generateUID;
