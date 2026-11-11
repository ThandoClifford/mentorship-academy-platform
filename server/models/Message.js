import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    mentorshipRelationship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRelationship',
      required: true,
      immutable: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
  },
  { timestamps: true },
);

messageSchema.index({ mentorshipRelationship: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
